import { getReactProps } from './reactFiber';
import { logCreatedOn, requestCreatedOn } from './createdOnBridge';
import { readIrSla } from './irSla';

export interface ScrapedData {
    errorText?: string;
    ticketTitle?: string;
    productCategory?: string;
    caseNumber?: string; // New field for Case Number
    createdOn?: string;
    irSlaStatus?: string;
    irSlaCapturedAt?: string;
    customerName?: string;
    severity?: string; // New field for Severity
    statusReason?: string; // New field for Status Reason
    description?: string;
    context?: string;
    timestamp?: string;
    source?: string;
}

/**
 * Regex for case/task IDs scraped from D365 pages:
 *   - 16-digit case number (e.g. 2601190030003106)
 *   - 19-digit task ID (e.g. 2601190030003106001) — prefix maps to parent case
 *   - Alpha-prefixed formats like WO-12345, INC-1234, CAS-01234-A1B2
 *
 * \b boundaries prevent matching digit runs adjacent to additional digits
 * (e.g. a 20-digit blob would not match).
 *
 * Exported at module scope so unit tests can assert against it directly
 * without spinning up a full jsdom document. See pageReader.test.ts.
 */
export const ID_REGEX = /(\b\d{16}(?:\d{3})?\b)|(\b[A-Z]{2,10}-?\d{3,}[-\w]*\b)/;

export const CUSTOMER_LOOKUP_SELECTOR = '[data-id="customerid.fieldControl-LookupResultsDropdown_customerid_SelectedRecordList"]';

type DomBudget = { nodes: number; work: number; text: number; deadline: number; exhausted: boolean };
type HeaderValue = { owner: Element | null; name: string | null; label: string; value: string };

export class PageReader {
    /**
     * Helper to yield control to the main thread to prevent freezing
     */
    private static async yieldToMain() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    private static domBudget(): DomBudget {
        return { nodes: 0, work: 0, text: 0, deadline: Date.now() + 1000, exhausted: false };
    }

    private static spendDomWork(budget: DomBudget, node = false): boolean {
        if (++budget.work > 12000 || (node && ++budget.nodes > 2000) || Date.now() > budget.deadline) budget.exhausted = true;
        return !budget.exhausted;
    }

    private static composedParent(node: Element): Element | null {
        const root = node.getRootNode();
        return node.assignedSlot || node.parentElement || (root instanceof ShadowRoot ? root.host : null);
    }

    // No geometry read: boxless custom-element hosts are supported. Visibility can
    // be overridden by descendants, but display/opacity apply through assigned slots.
    private static isRendered(node: Element, budget: DomBudget): boolean {
        if (!node.isConnected || !this.spendDomWork(budget)) return false;
        const style = getComputedStyle(node);
        if (style.visibility === 'hidden' || style.visibility === 'collapse') return false;
        let ancestor: Element | null = node;
        for (let depth = 0; ancestor; depth++) {
            if (depth === 64 || !this.spendDomWork(budget)) { budget.exhausted = true; return false; }
            const current = getComputedStyle(ancestor);
            if (ancestor.hasAttribute('hidden') || current.display === 'none' || current.opacity === '0') return false;
            ancestor = this.composedParent(ancestor);
        }
        return true;
    }

    private static readDomText(root: Element, budget: DomBudget): string | undefined {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
        let text = '';
        let node: Node | null;
        while ((node = walker.nextNode())) {
            if (!this.spendDomWork(budget, true)) return undefined;
            if (node.nodeType !== Node.TEXT_NODE) continue;
            const leaf = node as Text;
            if (leaf.length > 10000 - budget.text) { budget.exhausted = true; return undefined; }
            budget.text += leaf.length;
            if (leaf.parentElement && this.isRendered(leaf.parentElement, budget)) text += leaf.data;
        }
        return budget.exhausted ? undefined : text.trim();
    }

    private static headerOwner(item: Element, budget: DomBudget): Element | null {
        let owner: Element | null = null;
        let node: Element | null = item;
        for (let depth = 0; node; depth++) {
            if (depth === 64 || !this.spendDomWork(budget)) { budget.exhausted = true; return null; }
            if (node.matches('[role="main"], [role="tabpanel"]')) return node;
            if (node.localName === 'uci-header-control-list') owner = node;
            node = this.composedParent(node);
        }
        return owner;
    }

    private static *headerNodes(budget: DomBudget): Generator<Element> {
        const lists = document.querySelectorAll('uci-header-control-list');
        if (lists.length > 20) { budget.exhausted = true; return; }
        const roots: Node[] = Array.from(lists).reverse();
        const seen = new Set<Node>();
        while (roots.length) {
            const root = roots.pop()!;
            if (!this.spendDomWork(budget, true)) return;
            if (root instanceof Element && root.shadowRoot) roots.push(root.shadowRoot);
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
            let node: Element | null;
            while ((node = walker.nextNode() as Element | null)) {
                // Repeated visits through nested entry roots also consume the bound.
                if (!this.spendDomWork(budget, true)) return;
                if (seen.has(node)) continue;
                seen.add(node);
                if (node.shadowRoot) roots.push(node.shadowRoot);
                yield node;
            }
        }
    }

    private static headerValue(item: Element, budget: DomBudget): HeaderValue | undefined {
        if (item.localName !== 'uci-header-control-list-item') return undefined;
        let label = '';
        const values: string[] = [];
        for (const child of item.children) {
            if (!this.spendDomWork(budget, true)) return undefined;
            const slot = child.getAttribute('slot');
            if (slot === 'label') label = this.readDomText(child, budget)?.replace(/\s+/g, ' ').toLowerCase() || '';
            if (slot === 'value') {
                const value = this.readDomText(child, budget);
                if (value) values.push(value);
            }
        }
        const name = item.getAttribute('data-name');
        if (!values.length || (label !== 'case number / service name' && !['header_msdfm_casenumberservicelevel', 'header_ticketnumber', 'header_severitycode', 'header_statuscode'].includes(name || ''))) return undefined;
        return { owner: this.headerOwner(item, budget), name, label, value: values.join(' ') };
    }

    private static summarizeHeaders(entries: HeaderValue[]) {
        const data: Partial<ScrapedData> = {};
        const owners = new Set(entries.map(entry => entry.owner));
        if (owners.size > 1) return { data, number: null, owner: null };
        const primary = new Set<string>();
        const aliases = new Set<string>();
        for (const { name, label, value } of entries) {
            if (name === 'header_severitycode' && /^[1ABC]$/i.test(value)) data.severity ||= value;
            else if (name === 'header_statuscode') data.statusReason ||= value;
            else {
                const numbers = name === 'header_msdfm_casenumberservicelevel' || label === 'case number / service name'
                    ? primary : name === 'header_ticketnumber' ? aliases : undefined;
                if (numbers) for (const match of value.matchAll(new RegExp(ID_REGEX.source, 'g'))) numbers.add(match[0]);
            }
        }
        const numbers = primary.size ? primary : aliases;
        const number = numbers.size > 1 ? null : [...numbers][0];
        if (number) data.caseNumber = number;
        return { data, number, owner: entries[0]?.owner || null };
    }

    private static async readStructuredHeaders(): Promise<Partial<ScrapedData>> {
        const budget = this.domBudget();
        const entries: HeaderValue[] = [];
        let visited = 0;
        for (const node of this.headerNodes(budget)) {
            if (++visited % 50 === 0) await this.yieldToMain();
            if (!this.spendDomWork(budget)) return {};
            const entry = this.headerValue(node, budget);
            if (entry) entries.push(entry);
        }
        return budget.exhausted ? {} : this.summarizeHeaders(entries).data;
    }

    // Synchronous and bounded: no identity captured before a yield can authorize a scan.
    // undefined means no supported identity surface; null means present but unsafe.
    static readLiveRecordNumber(allowLegacyHeaders = true): string | null | undefined {
        const budget = this.domBudget();
        const entries: HeaderValue[] = [];
        // Finish traversal before reading values, including synchronous DOM seams.
        const nodes = [...this.headerNodes(budget)];
        for (const node of nodes) {
            if (budget.exhausted) return null;
            const entry = this.headerValue(node, budget);
            if (entry) entries.push(entry);
        }
        if (budget.exhausted) return null;
        const { number } = this.summarizeHeaders(entries);
        if (number !== undefined) return number;
        if (!allowLegacyHeaders) return undefined;
        // Same legacy header/title surfaces as extraction, without a broad label/body scan.
        for (const selector of ['[id^="headerControlsList_"]', '[id^="headerContainer"]', '[data-automation-id="ticket-title"], [data-test-id="ticket-header-title"], [id^="formHeaderTitle_"], h1, [role="heading"][aria-level="1"]']) {
            const headers = document.querySelectorAll(selector);
            if (headers.length > 20) return null;
            const numbers = new Set<string>();
            for (const header of headers) {
                const text = this.readDomText(header, budget);
                if (budget.exhausted) return null;
                if (text) for (const match of text.matchAll(new RegExp(ID_REGEX.source, 'g'))) numbers.add(match[0]);
            }
            if (numbers.size) return numbers.size === 1 ? [...numbers][0] : null;
        }
        return undefined;
    }

    // Customer-only DOM read; an enrichment caller must supply the exact live record.
    static readCustomerName(expectedCaseNumber?: string): string | undefined {
        const budget = this.domBudget();
        const entries: HeaderValue[] = [];
        const nodes = [...this.headerNodes(budget)];
        for (const node of nodes) {
            if (budget.exhausted) return undefined;
            const entry = this.headerValue(node, budget);
            if (entry) entries.push(entry);
        }
        const { number, owner } = this.summarizeHeaders(entries);
        if (budget.exhausted || !number || !/^\d{16}(?:\d{3})?$/.test(number)
            || (expectedCaseNumber !== undefined && expectedCaseNumber !== number)
            || !owner?.matches('[role="main"], [role="tabpanel"]')) return undefined;
        // Only a proven record pane can own a Customer lookup, never the document.
        let context = owner;
        let lists = context.querySelectorAll(CUSTOMER_LOOKUP_SELECTOR);
        if (!lists.length && owner.matches('[role="main"]')) {
            let ancestor = owner.parentElement;
            for (let depth = 0; ancestor; depth++) {
                if (depth === 64 || !this.spendDomWork(budget)) return undefined;
                if (ancestor.matches('[role="tabpanel"]')) { context = ancestor; break; }
                ancestor = ancestor.parentElement;
            }
            lists = context.querySelectorAll(CUSTOMER_LOOKUP_SELECTOR);
        }
        if (lists.length > 20) return undefined;
        const mains = context.querySelectorAll('[role="main"]');
        if (mains.length > 20) return undefined;
        let visibleMains = 0;
        for (const main of mains) if (this.isRendered(main, budget) && ++visibleMains > 1) return undefined;
        // Layout wrappers are not ownership boundaries; nested panels/widgets are.
        const belongsToRecord = (element: Element): boolean => {
            let ancestor = element.parentElement;
            for (let depth = 0; ancestor; depth++, ancestor = ancestor.parentElement) {
                if (depth === 64 || !this.spendDomWork(budget)) { budget.exhausted = true; return false; }
                if (ancestor.getAttribute('aria-hidden') === 'true') return false;
                if (ancestor === context) return true;
                if (ancestor.matches('[role="tabpanel"], [role="tablist"], uci-header-control-list')
                    || (ancestor.matches('[role="main"]') && ancestor !== owner)) return false;
            }
            return false;
        };
        const customerNames = new Set<string>();
        for (const list of lists) {
            if (!this.isRendered(list, budget)) continue;
            let container: Element | null = list;
            for (let depth = 0; container; depth++) {
                if (depth === 64 || !this.spendDomWork(budget)) return undefined;
                if (container.getAttribute('aria-hidden') === 'true') return undefined;
                if (container === context) break;
                if (container.matches('[role="main"]') && container !== owner) return undefined;
                if (container.matches('[role="tabpanel"]') && !container.contains(owner)) {
                    // A content panel is not a record pane: require its selected tab
                    // under the same owner, and never cross an independent header.
                    if (container.querySelector('uci-header-control-list') || !belongsToRecord(container)) return undefined;
                    const tabs = context.querySelectorAll('[role="tablist"] > [role="tab"][aria-selected="true"]');
                    if (tabs.length > 20) return undefined;
                    let selected = 0;
                    let associated = false;
                    for (const tab of tabs) {
                        if (!this.spendDomWork(budget)) return undefined;
                        const tablist = tab.parentElement!;
                        if (!belongsToRecord(tablist) || tablist.getAttribute('aria-hidden') === 'true'
                            || tab.getAttribute('aria-hidden') === 'true' || !this.isRendered(tab, budget)) continue;
                        selected++;
                        const controls = tab.getAttribute('aria-controls');
                        if (controls) associated = controls === container.id && document.getElementById(controls) === container;
                        else {
                            const label = container.getAttribute('aria-label')?.trim();
                            const tabLabel = tab.getAttribute('aria-label') || this.readDomText(tab, budget);
                            if (!label || label.length > 256 || tabLabel?.trim() !== label) return undefined;
                            const panels = context.querySelectorAll('[role="tabpanel"]');
                            if (panels.length > 20) return undefined;
                            let matchingPanels = 0;
                            for (const panel of panels) {
                                if (!this.spendDomWork(budget)) return undefined;
                                if (belongsToRecord(panel) && this.isRendered(panel, budget)
                                    && panel.getAttribute('aria-hidden') !== 'true'
                                    && panel.getAttribute('aria-label')?.trim() === label) matchingPanels++;
                            }
                            associated = matchingPanels === 1;
                        }
                    }
                    if (selected !== 1 || !associated) return undefined;
                }
                container = container.parentElement;
            }
            const walker = document.createTreeWalker(list, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
            const names = new Map<Element, string>();
            const leaves = new Set<string>();
            const items = new Set<Element>();
            let node: Node | null;
            while ((node = walker.nextNode())) {
                if (!this.spendDomWork(budget, true)) return undefined;
                if (node instanceof Element && node.localName === 'li' && this.isRendered(node, budget)) {
                    items.add(node);
                    if (items.size > 1) return undefined;
                }
                if (node.nodeType !== Node.TEXT_NODE) continue;
                const leaf = node as Text;
                if (leaf.length > 10000 - budget.text) return undefined;
                budget.text += leaf.length;
                let ancestor = leaf.parentElement;
                let item: Element | undefined;
                let link: Element | undefined;
                let excluded = false;
                for (let depth = 0; ancestor && ancestor !== list; depth++) {
                    if (depth === 64 || !this.spendDomWork(budget)) return undefined;
                    if (ancestor.matches('button, [role="button"], svg, img, input, [hidden], [aria-hidden="true"], [aria-label*="remove" i], [aria-label*="clear" i], [data-id^="customerid.fieldControl-entityIconContainer_"]')) excluded = true;
                    if (ancestor.localName === 'li') item = ancestor;
                    if (ancestor.localName === 'a') link = ancestor;
                    ancestor = ancestor.parentElement;
                }
                if (excluded || !item || !leaf.parentElement || !this.isRendered(leaf.parentElement, budget)) continue;
                const text = leaf.data.trim();
                if (!text || /^(x|\u00d7|remove|clear)$/i.test(text)) continue;
                items.add(item);
                if (items.size > 1) return undefined;
                if (link) names.set(link, (names.get(link) || '') + leaf.data);
                else leaves.add(text);
            }
            const candidates = new Set(names.size ? [...names.values()].map(name => name.trim()) : leaves);
            if (candidates.size > 1) return undefined;
            candidates.forEach(name => customerNames.add(name));
        }
        if (budget.exhausted) return undefined;
        if (customerNames.size === 1) {
            const name = customerNames.values().next().value;
            if (name && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name.replace(/^\{(.+)\}$/, '$1'))) return name;
        }
        return undefined;
    }

    private static async readCreatedOn(context: Element): Promise<string | undefined> {
        const inputSelector = 'input:not([type="hidden"]):not([type="button"]), textarea';
        const budget = this.domBudget();
        const chargeText = (value: string): boolean => {
            if (!this.spendDomWork(budget) || value.length > 10000 - budget.text) {
                budget.exhausted = true;
                return false;
            }
            budget.text += value.length;
            return true;
        };
        const attribute = (element: Element, name: string): string => {
            if (!this.spendDomWork(budget)) return '';
            const value = element.getAttribute(name) || '';
            return chargeText(value) ? value : '';
        };
        const walk = function* (root: Element): Generator<Node> {
            if (!PageReader.spendDomWork(budget)) return;
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL);
            while (PageReader.spendDomWork(budget, true)) {
                const node = walker.nextNode();
                if (!node) return;
                yield node;
            }
        };
        // Labels retain their existing text semantics, including hidden labels used
        // by visible readonly controls; never aggregate an unbounded textContent.
        const text = (element: Element): string => {
            let value = '';
            for (const node of walk(element)) {
                if (node.nodeType !== Node.TEXT_NODE) continue;
                const leaf = node as Text;
                if (leaf.length > 10000 - budget.text) { budget.exhausted = true; return ''; }
                if (!chargeText(leaf.data)) return '';
                value += leaf.data;
            }
            return value.trim().toLowerCase();
        };
        const firstChild = context.firstChild;
        const discovered: { node: Node; parent: Node | null; next: Node | null; first: Node | null }[] = [];
        for (const node of walk(context)) {
            discovered.push({ node, parent: node.parentNode, next: node.nextSibling, first: node.firstChild });
            if (discovered.length % 50 === 0) {
                if (!this.spendDomWork(budget)) return undefined;
                await this.yieldToMain();
                if (!this.spendDomWork(budget)) return undefined;
            }
        }
        if (budget.exhausted || !context.isConnected || context.firstChild !== firstChild) return undefined;
        // No more awaits: validate discovery topology, then read current attributes
        // and values. A changed tree cannot authorize a partial candidate inventory.
        const datetimeFields: Element[] = [];
        const labels: Element[] = [];
        const inputs: Element[] = [];
        const references: { element: Element; ids: string[] }[] = [];
        const byId = new Map<string, Element | null>();
        for (const { node, parent, next, first } of discovered) {
            if (!this.spendDomWork(budget) || !node.isConnected || node.parentNode !== parent || node.nextSibling !== next || node.firstChild !== first) return undefined;
            if (node.nodeType === Node.TEXT_NODE) {
                const leaf = node as Text;
                if (leaf.length > 10000 - budget.text || !chargeText(leaf.data)) return undefined;
            }
            if (!(node instanceof Element)) continue;
            if (attribute(node, 'data-id') === 'createdon.fieldControl-datetime-description_container') datetimeFields.push(node);
            if (node.matches(inputSelector)) inputs.push(node);
            if (node.matches('label, span, div') && node.childElementCount === 0 && text(node) === 'created on') labels.push(node);
            const id = attribute(node, 'id');
            if (id) byId.set(id, byId.has(id) ? null : node);
            const ids = attribute(node, 'aria-labelledby');
            if (ids) references.push({ element: node, ids: ids.split(/\s+/) });
            if (budget.exhausted) return undefined;
        }
        const inside = (element: Element, field: Element): boolean => {
            let ancestor = element.parentElement;
            for (let depth = 0; ancestor; depth++, ancestor = ancestor.parentElement) {
                if (depth === 64 || !this.spendDomWork(budget)) { budget.exhausted = true; return false; }
                if (ancestor === field) return true;
                if (ancestor === context) return false;
            }
            return false;
        };
        const foreign = (element: Element, field: Element): boolean => {
            let ancestor: Element | null = element;
            for (let depth = 0; ancestor && ancestor !== field; depth++, ancestor = ancestor.parentElement) {
                if (depth === 64 || !this.spendDomWork(budget)) { budget.exhausted = true; return true; }
                const id = attribute(ancestor, 'data-id');
                if (id.includes('.fieldControl') && !id.startsWith('createdon.')) return true;
            }
            return false;
        };
        const fieldInputs = (field: Element, excludeForeign = false): Element[] => {
            const result: Element[] = [];
            for (const input of inputs) {
                if (!this.spendDomWork(budget)) break;
                if (inside(input, field) && (!excludeForeign || !foreign(input, field))) result.push(input);
                if (result.length > 2 || budget.exhausted) break;
            }
            return result;
        };
        const values = new Map<Element, string>();
        const readValues = (controls: Iterable<Element>): string | undefined => {
            const result: string[] = [];
            for (const control of controls) {
                if (!this.spendDomWork(budget) || !context.isConnected || !control.isConnected || !inside(control, context)) {
                    budget.exhausted = true;
                    return undefined;
                }
                if (foreign(control, context) || !this.isRendered(control, budget)) continue;
                if (!values.has(control)) {
                    const raw = (control as HTMLInputElement).value;
                    if (raw.length > 256 || !chargeText(raw)) { budget.exhausted = true; return undefined; }
                    values.set(control, raw.trim());
                }
                const value = values.get(control)!;
                if (value) result.push(value);
            }
            return this.spendDomWork(budget) && context.isConnected ? result.join(' ') || undefined : undefined;
        };
        if (budget.exhausted) return undefined;
        if (datetimeFields.length > 1) return undefined;
        if (datetimeFields.length === 1) {
            // D365's readonly inputs can be deeply nested and have no usable label-for target.
            const controls = fieldInputs(datetimeFields[0], true);
            if (budget.exhausted || controls.length > 2) return undefined;
            const value = readValues(controls);
            if (budget.exhausted || value) return value;
        }
        for (const label of labels.slice(0, 20)) {
            if (!this.spendDomWork(budget)) return undefined;
            const associated = new Set<Element>();
            const targetId = attribute(label, 'for');
            const target = targetId ? byId.get(targetId) : null;
            if (targetId && (!target || !inside(target, context))) continue;
            if (target) associated.add(target);
            const labelId = attribute(label, 'id');
            if (labelId) {
                for (const { element, ids } of references) {
                    for (const id of ids) {
                        if (!this.spendDomWork(budget)) return undefined;
                        if (id === labelId) { associated.add(element); break; }
                    }
                }
            }
            const isSingleField = (field: Element): boolean => {
                if (!this.spendDomWork(budget) || field === context || field.matches('section, form, main, [role="main"]')) return false;
                const check = (el: Element): boolean => {
                    if (!this.spendDomWork(budget)) return false;
                    const id = attribute(el, 'data-id');
                    return !(el.matches('label') && el !== label && text(el) !== 'created on')
                        && !(el.childElementCount === 0 && text(el) === 'modified on')
                        && !/modified on/i.test(attribute(el, 'aria-label'))
                        && !(id.includes('.fieldControl') && !id.startsWith('createdon.'));
                };
                if (!check(field)) return false;
                for (const node of walk(field)) {
                    if (node instanceof Element && node.matches('label, span, div, [aria-label], [data-id]') && !check(node)) return false;
                }
                return !budget.exhausted;
            };
            // Apply the same boundary to ancestors and aria-labelledby groups.
            let field = label.parentElement;
            for (let depth = 0; field && depth < 3; depth++, field = field.parentElement) {
                if (!isSingleField(field)) break;
                const candidates = fieldInputs(field);
                if (candidates.length) {
                    if (candidates.length <= 2 && (!target || inside(target, field))) candidates.forEach(input => associated.add(input));
                    break;
                }
            }
            const controls = new Set<Element>();
            for (const el of associated) {
                if (!this.spendDomWork(budget)) return undefined;
                if (el.matches(inputSelector)) controls.add(el);
                else if (isSingleField(el)) fieldInputs(el).forEach(input => controls.add(input));
                if (controls.size > 2) break;
            }
            if (budget.exhausted) return undefined;
            if (controls.size > 2) continue;
            const ordered = Array.from(controls).sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
            const value = readValues(ordered);
            if (budget.exhausted || value) return value;
        }
        const explicit: Element[] = [];
        for (const input of inputs) {
            if (!this.spendDomWork(budget)) return undefined;
            if (attribute(input, 'data-id').startsWith('createdon.')) explicit.push(input);
            if (explicit.length > 2 || budget.exhausted) return undefined;
        }
        return readValues(explicit);
    }

    /**
     * Checks neighbors of a label node to find a value.
     * Strategies: Previous Sibling, Parent's Previous Sibling.
     */
    private static extractValueFromNeighbors(labelNode: Element, validationRegex?: RegExp, budget = this.domBudget()): string | undefined {
        // Strategy 1: Check immediate previous sibling
        // DOM: <ValueDiv>...</ValueDiv> <LabelDiv>Label</LabelDiv>
        let value = this.extractValueFromNode(labelNode.previousElementSibling, budget);
        if (value && (!validationRegex || validationRegex.test(value))) {
            return value;
        }

        // Strategy 2: Check Parent's previous sibling
        // DOM: <Wrapper><ValueDiv>...</ValueDiv></Wrapper> <Wrapper><LabelDiv>Label</LabelDiv></Wrapper>
        if (labelNode.parentElement) {
            value = this.extractValueFromNode(labelNode.parentElement.previousElementSibling, budget);
            if (value && (!validationRegex || validationRegex.test(value))) {
                return value;
            }
        }
        return undefined;
    }

    /**
     * Helper to find value associated with a label that appears AFTER the value in DOM (common in this UI)
     */
    private static async findValueForLabel(labelText: string, validationRegex?: RegExp, contextNode: Node = document): Promise<string | undefined> {
        // Find all elements containing the label
        // Use relative path .//* to scope to contextNode
        const iterator = document.evaluate(
            `.//*[text()='${labelText}']`, // Start with exact match priority
            contextNode,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        // Safety: Limit checks to prevent freezing on pages with many matches
        const maxChecks = 10;
        const count = Math.min(iterator.snapshotLength, maxChecks);

        for (let i = 0; i < count; i++) {
            // Yield every few iterations
            if (i > 0 && i % 2 === 0) await this.yieldToMain();

            const labelNode = iterator.snapshotItem(i) as HTMLElement;
            if (!labelNode) continue;

            const value = this.extractValueFromNeighbors(labelNode, validationRegex);
            if (value) return value;
        }
        
        await this.yieldToMain();

        // Fallback: Try contains if exact match failed
        // Note: This is expensive, so we yield before starting it
        const looseIterator = document.evaluate(
            `.//*[contains(text(), '${labelText}')]`,
            contextNode,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        const looseCount = Math.min(looseIterator.snapshotLength, maxChecks);

        for (let i = 0; i < looseCount; i++) {
            if (i > 0 && i % 2 === 0) await this.yieldToMain();

            const labelNode = looseIterator.snapshotItem(i) as HTMLElement;
            if (!labelNode) continue;
            
             // Skip if it's too long (likely a sentence containing the word, not a label)
            if (labelNode.textContent && labelNode.textContent.length > 50) continue;

            const value = this.extractValueFromNeighbors(labelNode, validationRegex);
            if (value) return value;
        }

        return undefined;
    }

    private static extractValueFromNode(node: Element | null, budget = this.domBudget()): string | undefined {
        if (!node) return undefined;
        const text = this.readDomText(node, budget);
        // Ignore empty or structural characters if necessary, but usually trim() is enough
        return text || undefined;
    }

    /**
     * Attempts to find error logs or relevant support ticket details on the page.
     * Prioritizes Fluent UI specific selectors and React Props.
     * Async to prevent blocking the UI thread.
     */
    static async scanForErrors(generation?: number): Promise<ScrapedData | null> {
        const data: ScrapedData = {};
        
        // Define a Context Node to limit searches (Performance)
        // Try to find the main form/content area
        const contextNode = document.querySelector('[role="main"]') || 
                            document.querySelector('[data-automation-id="content-container"]') || 
                            document.body;

        // 1. Selection Based: If user selected text, use that as primary error/description
        const selection = window.getSelection();
        if (selection && selection.toString().length > 5) {
            data.errorText = selection.toString();
            data.source = 'user-selection';
        }

        await this.yieldToMain();

        // 2. Try to find Ticket Title
        // Common selectors for title in support portals
        const titleSelectors = [
            '[data-automation-id="ticket-title"]',
            '[data-test-id="ticket-header-title"]',
            '[id^="formHeaderTitle_"]', // Matches dynamic IDs like formHeaderTitle_27
            'h1', // Generic fallback
            '[role="heading"][aria-level="1"]'
        ];
        
        for (const sel of titleSelectors) {
            const el = document.querySelector(sel);
            if (el && el.textContent) {
                // Remove "- Saved" suffix if present (common system status)
                data.ticketTitle = el.textContent.replace(/- Saved$/, '').trim();
                break;
            }
        }

        await this.yieldToMain();

        // 3. Try to find Case Number / Ticket ID
        const idLabels = ['Case number', 'Work Order Number', 'Incident Number', 'Ticket Number'];
        
        // Regex hoisted to module-level ID_REGEX (see top of file) so tests
        // can target the pattern directly.
        const idRegex = ID_REGEX;

        const structuredHeaders = await this.readStructuredHeaders();
        data.caseNumber = structuredHeaders.caseNumber;

        // Strategy A: Check specific header container if it exists (Case Number specific)
        const headerControls = document.querySelector('[id^="headerControlsList_"]');
        if (!data.caseNumber && headerControls) {
             const text = this.readDomText(headerControls, this.domBudget()) || '';
             const match = text.match(idRegex);
             if (match) {
                 data.caseNumber = match[0];
             }
        }

        // Strategy B: Generic Label Search for various ID types
        if (!data.caseNumber) {
            // Construct XPath to search for any of the labels
            // Use relative path .//*
            const labelsXPath = idLabels.map(l => `contains(text(), '${l}')`).join(' or ');
            
            const budget = this.domBudget();
            const snapshot = document.evaluate(
                `.//*[${labelsXPath}]`, 
                contextNode, 
                null, 
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
            );
            
            // Snapshot membership survives live DOM mutations while yielding.
            for (let index = 0; index < Math.min(snapshot.snapshotLength, 15); index++) {
                if ((index + 1) % 5 === 0) await this.yieldToMain();
                if (!this.spendDomWork(budget, true)) break;
                const node = snapshot.snapshotItem(index);
                if (!(node instanceof Element) || !contextNode.contains(node) || !this.isRendered(node, budget)) continue;

                // Check parent hierarchy for the value
                const parent = node.parentElement;
                if (parent && parent.parentElement) {
                     // Look for numbers or ID-like patterns
                     // OPTIMIZED: Use extractValueFromNeighbors directly on the node we just found
                     // instead of recursively searching the entire tree again with findValueForLabel.
                     // IMPORTANT: pass idRegex as the validator. Without it, D365 cells that pack
                     // the case ID together with the SKU into one text node
                     // ("2605080030003014001 | Unfd AddOn | ProSv Ente - China Cld") would slip
                     // through verbatim and break the host's _extract_case_id contract.
                      const value = this.extractValueFromNeighbors(node, idRegex, budget);

                     if (value && value.length > 3) { // Basic length check
                         // extractValueFromNeighbors with a regex returns the raw matched
                         // string when the value passes test(); narrow it via match() so we
                         // strip any surrounding noise (extractValueFromNode currently passes
                         // the full text - this is the belt-and-braces guard).
                         const m = value.match(idRegex);
                         data.caseNumber = m ? m[0] : value;
                         break;
                     }
                }
            }
        }
        
        await this.yieldToMain();

        // Strategy C: Direct Regex scan on header container
        if (!data.caseNumber) {
            const headerContainer = document.querySelector('[id^="headerContainer"]'); // or outerHeaderContainer_
             if (headerContainer) {
                 const match = this.readDomText(headerContainer, this.domBudget())?.match(idRegex);
                 if (match) data.caseNumber = match[0];
             }
        }

        // Strategy D: Last Resort - Check Ticket Title for ID
        if (!data.caseNumber && data.ticketTitle) {
            const titleMatch = data.ticketTitle.match(idRegex);
            if (titleMatch) {
                data.caseNumber = titleMatch[0];
            }
        }

        await this.yieldToMain();

        // 3.1 Try to find Severity (New)
        // Use helper with regex for 1, A, B, C
        data.severity = structuredHeaders.severity || await this.findValueForLabel('Severity', /^[1ABC]$/i, contextNode);

        // 3.2 Try to find Status Reason (New)
        // Use helper with basic length validation
        data.statusReason = structuredHeaders.statusReason || await this.findValueForLabel('Status reason', undefined, contextNode);

        data.createdOn = await this.readCreatedOn(contextNode);
        data.customerName = this.readCustomerName(data.caseNumber);

        // 4. Try to find Product Category
        const categorySelectors = [
            '#sapTextAreaId', // Specific textarea for Support Area Path
            '[id="sapTextAreaId"]', // Alternative query for the same ID
            'textarea[id*="sapTextArea"]', // Loose match
            'textarea', // Fallback: Check ALL textareas for ID match in loop if needed
            '[data-automation-id="product-category"]',
            '.breadcrumb-item',
            '[aria-label="Product Category"]'
        ];
        
        for (const sel of categorySelectors) {
            let el: Element | null = null;
            
            if (sel === 'textarea') {
                const textareas = document.querySelectorAll('textarea');
                for (const ta of Array.from(textareas)) {
                     if (ta.id && ta.id.toLowerCase().includes('saptextarea')) {
                         el = ta;
                         break;
                     }
                }
            } else {
                el = document.querySelector(sel);
            }

            if (el) {
                const val = (el as HTMLTextAreaElement).value || el.textContent;
                if (val) {
                    data.productCategory = val.trim();
                    break;
                }
            }
        }

        await this.yieldToMain();

        // 4. Try to find Description if not selected
        if (!data.errorText) {
             const descSelectors = [
                '[data-automation-id="ticket-description"]',
                '[data-test-id="case-description"]',
                '.ticket-description-body',
                'textarea[aria-label="Customer Statement"]'
            ];
            
            for (const sel of descSelectors) {
                const el = document.querySelector(sel);
                if (el) {
                    // Check if it's a textarea/input to get value, otherwise use textContent/React props
                    if ((el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) && el.value) {
                         data.description = el.value.trim();
                    } else {
                        const props = getReactProps(el);
                        if (props && props.children) {
                            data.description = this.extractTextFromChildren(props.children);
                        } else {
                             data.description = el.textContent || "";
                        }
                    }

                    if (data.description) break;
                }
            }
        }

        // 5. Try to find a common Fluent UI Error Message Bar (as fallback or addition)
        if (!data.errorText && !data.description) {
            const errorContainer = document.querySelector('[data-automation-id="error-message"]');
            if (errorContainer) {
                const props = getReactProps(errorContainer);
                if (props && props.children) {
                    data.errorText = this.extractTextFromChildren(props.children);
                    data.source = 'fluent-automation-id';
                } else {
                    data.errorText = errorContainer.textContent || "";
                    data.source = 'dom-text';
                }
            } else {
                // Generic Search for "Error" keyword in specific UI roles (Alerts)
                const alerts = document.querySelectorAll('[role="alert"]');
                for (const alert of Array.from(alerts)) {
                    if (alert.textContent && alert.textContent.toLowerCase().includes('error')) {
                        data.errorText = alert.textContent;
                        data.source = 'aria-role-alert';
                        break;
                    }
                }
            }
        }

        if (data.caseNumber && /^\d{16}(?:\d{3})?$/.test(data.caseNumber)) {
            const before = this.readLiveRecordNumber();
            if (before === null || (before !== undefined && before !== data.caseNumber)) {
                logCreatedOn('scan', 'identity_rejected', generation);
                return null;
            }
            // Unsupported legacy identity keeps DOM data without starting an unbound wait.
            const irCaseNumber = this.readLiveRecordNumber(false);
            if (before !== undefined) {
                const createdOn = await requestCreatedOn(data.caseNumber, generation);
                if (this.readLiveRecordNumber() !== before) {
                    logCreatedOn('scan', 'identity_changed', generation);
                    return null;
                }
                if (createdOn) data.createdOn = createdOn;
                logCreatedOn('scan', createdOn ? 'success' : data.createdOn ? 'dom_fallback' : 'missing', generation);
            } else {
                logCreatedOn('scan', 'not_requested', generation);
            }
            // No await after IR capture: bind the pair to the exact live 16/19-digit
            // record, never a title/legacy fallback or a task's parent case.
            if (this.readLiveRecordNumber(false) !== irCaseNumber) return null;
            if (irCaseNumber === data.caseNumber) {
                const irSla = readIrSla(irCaseNumber);
                if (this.readLiveRecordNumber(false) !== irCaseNumber) return null;
                if (irSla) {
                    data.irSlaStatus = irSla.status;
                    data.irSlaCapturedAt = irSla.capturedAt;
                }
            }
        } else {
            logCreatedOn('scan', 'not_requested', generation);
        }

        // Return data if we found *something* useful
        if (data.errorText || data.ticketTitle || data.description || data.productCategory || data.caseNumber || data.severity || data.statusReason) {
            // Consolidate "errorText" for the analyze function if description is better
            if (!data.errorText && data.description) {
                data.errorText = data.description;
                data.source = 'ticket-description';
            }
            // Fallback: If we only have a title but no error/description, use the title as the error text
            // This ensures the "Analyze" button is enabled for tickets that just have a title
            else if (!data.errorText && data.ticketTitle) {
                data.errorText = data.ticketTitle;
                data.source = 'ticket-title-fallback';
            }

            return data;
        }

        return null;
    }

    /**
     * Recursively extracts text from React Children structures (strings, arrays, or objects)
     */
    private static extractTextFromChildren(children: any): string {
        if (!children) return "";
        
        if (typeof children === 'string') return children;
        if (typeof children === 'number') return String(children);
        
        if (Array.isArray(children)) {
            return children.map(c => this.extractTextFromChildren(c)).join(" ");
        }

        if (typeof children === 'object') {
            // Check for common React element props
            if (children.props && children.props.children) {
                return this.extractTextFromChildren(children.props.children);
            }
            // Sometimes it's just an object with text inside (rare but possible in custom components)
        }

        return "";
    }
}
