import { getReactProps } from './reactFiber';
import { requestCreatedOn } from './createdOnBridge';

export interface ScrapedData {
    errorText?: string;
    ticketTitle?: string;
    productCategory?: string;
    caseNumber?: string; // New field for Case Number
    createdOn?: string;
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

export class PageReader {
    /**
     * Helper to yield control to the main thread to prevent freezing
     */
    private static async yieldToMain() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    private static async readStructuredHeaders(): Promise<Partial<ScrapedData>> {
        const data: Partial<ScrapedData> = {};
        let aliasCaseNumber: string | undefined;
        // Only known header lists are entry points, never arbitrary page/shadow text.
        const roots: Node[] = Array.from(document.querySelectorAll('uci-header-control-list')).slice(0, 20).reverse();
        let visited = 0;
        while (roots.length && visited < 2000) {
            const root = roots.pop()!;
            if (root instanceof Element && root.shadowRoot) roots.push(root.shadowRoot);
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
            let node = walker.nextNode() as Element | null;
            while (node && visited < 2000) {
                if (++visited % 50 === 0) await this.yieldToMain();
                if (node.shadowRoot) roots.push(node.shadowRoot);
                if (node.localName === 'uci-header-control-list-item') {
                    // The observed values are light children, not text in the item's shadow controls.
                    const valueNode = node.querySelector('[slot="value"]');
                    const labelNode = node.querySelector('[slot="label"]');
                    const value = valueNode?.parentElement === node ? valueNode.textContent?.trim() : undefined;
                    const label = labelNode?.parentElement === node ? labelNode.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() : undefined;
                    const name = node.getAttribute('data-name');
                    if (value) {
                        if (name === 'header_severitycode') {
                            if (!data.severity && /^[1ABC]$/i.test(value)) data.severity = value;
                        } else if (name === 'header_statuscode') {
                            data.statusReason ||= value;
                        } else if (name === 'header_msdfm_casenumberservicelevel' || label === 'case number / service name') {
                            data.caseNumber ||= value.match(ID_REGEX)?.[0];
                        } else if (name === 'header_ticketnumber') {
                            aliasCaseNumber ||= value.match(ID_REGEX)?.[0];
                        }
                    }
                }
                node = walker.nextNode() as Element | null;
            }
        }
        data.caseNumber ||= aliasCaseNumber;
        return data;
    }

    // Synchronous and bounded: no identity captured before a yield can authorize a scan.
    // undefined means no supported identity surface; null means present but unsafe.
    private static readLiveRecordNumber(): string | null | undefined {
        const lists = document.querySelectorAll('uci-header-control-list');
        if (lists.length > 20) return null;
        const roots: Node[] = Array.from(lists);
        const seen = new Set<Node>();
        const items: Element[] = [];
        let visited = 0;
        while (roots.length) {
            const root = roots.pop()!;
            if (root instanceof Element && root.shadowRoot) roots.push(root.shadowRoot);
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
            let node: Element | null;
            while ((node = walker.nextNode() as Element | null)) {
                if (seen.has(node)) continue;
                seen.add(node);
                if (++visited > 2000) return null;
                if (node.shadowRoot) roots.push(node.shadowRoot);
                if (node.localName === 'uci-header-control-list-item') items.push(node);
            }
        }
        const primary = new Set<string>();
        const aliases = new Set<string>();
        for (const item of items) {
            if (!item.isConnected) continue;
            const children = Array.from(item.children);
            const label = children.find(el => el.getAttribute('slot') === 'label')?.textContent?.replace(/\s+/g, ' ').trim().toLowerCase();
            const name = item.getAttribute('data-name');
            const numbers = name === 'header_msdfm_casenumberservicelevel' || label === 'case number / service name'
                ? primary : name === 'header_ticketnumber' ? aliases : undefined;
            if (!numbers) continue;
            for (const value of children.filter(el => el.getAttribute('slot') === 'value')) {
                for (const match of (value.textContent || '').matchAll(new RegExp(ID_REGEX.source, 'g'))) numbers.add(match[0]);
            }
        }
        const numbers = primary.size ? primary : aliases;
        if (numbers.size) return numbers.size === 1 ? [...numbers][0] : null;
        // Same legacy header/title surfaces as extraction, without a broad label/body scan.
        for (const selector of ['[id^="headerControlsList_"]', '[id^="headerContainer"]', '[data-automation-id="ticket-title"], [data-test-id="ticket-header-title"], [id^="formHeaderTitle_"], h1, [role="heading"][aria-level="1"]']) {
            const header = document.querySelector(selector);
            if (!header) continue;
            const walker = document.createTreeWalker(header, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
            let text = '';
            let node: Node | null;
            while ((node = walker.nextNode())) {
                if (++visited > 2000 || text.length > 10000) return null;
                if (node.nodeType === Node.TEXT_NODE) text += node.textContent || '';
            }
            const match = text.match(ID_REGEX)?.[0];
            if (match) return match;
        }
        return undefined;
    }

    private static async readCreatedOn(context: Element): Promise<string | undefined> {
        const inputSelector = 'input:not([type="hidden"]):not([type="button"]), textarea';
        const datetimeFields = context.querySelectorAll('[data-id="createdon.fieldControl-datetime-description_container"]');
        if (datetimeFields.length > 1) return undefined;
        if (datetimeFields.length === 1) {
            // D365's readonly inputs can be deeply nested and have no usable label-for target.
            const field = datetimeFields[0];
            const inputs = Array.from(field.querySelectorAll(inputSelector)).filter(input => {
                const foreignField = input.closest('[data-id*=".fieldControl"]:not([data-id^="createdon."])');
                return !foreignField || !field.contains(foreignField);
            });
            if (inputs.length > 2) return undefined;
            const values = inputs.map(el => (el as HTMLInputElement).value.trim()).filter(Boolean);
            if (values.length) return values.join(' ');
        }
        const labels = Array.from(context.querySelectorAll('label, span, div')).filter(el =>
            el.childElementCount === 0 && el.textContent?.trim().toLowerCase() === 'created on'
        );
        for (const label of labels.slice(0, 20)) {
            await this.yieldToMain();
            const associated = new Set<Element>();
            const targetId = label.getAttribute('for');
            const target = targetId ? document.getElementById(targetId) : null;
            if (targetId && (!target || !context.contains(target))) continue;
            if (target && context.contains(target)) associated.add(target);
            if (label.id) {
                for (const control of context.querySelectorAll('[aria-labelledby]')) {
                    if (control.getAttribute('aria-labelledby')?.split(/\s+/).includes(label.id)) associated.add(control);
                }
            }
            const isSingleField = (field: Element) => field !== context
                && !field.matches('section, form, main, [role="main"]')
                && ![field, ...field.querySelectorAll('label, span, div, [aria-label], [data-id]')].some(el =>
                    (el.matches('label') && el !== label && el.textContent?.trim().toLowerCase() !== 'created on')
                    || (el.childElementCount === 0 && el.textContent?.trim().toLowerCase() === 'modified on')
                    || /modified on/i.test(el.getAttribute('aria-label') || '')
                    || (el.getAttribute('data-id')?.includes('.fieldControl') && !el.getAttribute('data-id')?.startsWith('createdon.'))
                );
            // Apply the same boundary to ancestors and aria-labelledby groups.
            let field = label.parentElement;
            for (let depth = 0; field && depth < 3; depth++, field = field.parentElement) {
                if (!isSingleField(field)) break;
                const inputs = Array.from(field.querySelectorAll(inputSelector));
                if (inputs.length) {
                    if (inputs.length <= 2 && (!target || field.contains(target))) inputs.forEach(input => associated.add(input));
                    break;
                }
            }
            const controls = new Set<Element>();
            for (const el of associated) {
                if (el.matches(inputSelector)) controls.add(el);
                else if (isSingleField(el)) el.querySelectorAll(inputSelector).forEach(input => controls.add(input));
            }
            if (controls.size > 2) continue;
            const values = Array.from(controls)
                .sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
                .map(el => (el as HTMLInputElement).value.trim()).filter(Boolean);
            if (values.length) return values.join(' ');
        }
        const explicit = Array.from(context.querySelectorAll(inputSelector)).filter(el =>
            el.getAttribute('data-id')?.startsWith('createdon.')
        );
        if (explicit.length > 2) return undefined;
        return explicit.map(el => (el as HTMLInputElement).value.trim()).filter(Boolean).join(' ') || undefined;
    }

    /**
     * Checks neighbors of a label node to find a value.
     * Strategies: Previous Sibling, Parent's Previous Sibling.
     */
    private static extractValueFromNeighbors(labelNode: Element, validationRegex?: RegExp): string | undefined {
        // Strategy 1: Check immediate previous sibling
        // DOM: <ValueDiv>...</ValueDiv> <LabelDiv>Label</LabelDiv>
        let value = this.extractValueFromNode(labelNode.previousElementSibling);
        if (value && (!validationRegex || validationRegex.test(value))) {
            return value;
        }

        // Strategy 2: Check Parent's previous sibling
        // DOM: <Wrapper><ValueDiv>...</ValueDiv></Wrapper> <Wrapper><LabelDiv>Label</LabelDiv></Wrapper>
        if (labelNode.parentElement) {
            value = this.extractValueFromNode(labelNode.parentElement.previousElementSibling);
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

    private static extractValueFromNode(node: Element | null): string | undefined {
        if (!node) return undefined;
        // Get text, clean it up
        const text = (node.textContent || "").trim();
        // Ignore empty or structural characters if necessary, but usually trim() is enough
        return text || undefined;
    }

    /**
     * Attempts to find error logs or relevant support ticket details on the page.
     * Prioritizes Fluent UI specific selectors and React Props.
     * Async to prevent blocking the UI thread.
     */
    static async scanForErrors(): Promise<ScrapedData | null> {
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
             const text = headerControls.textContent || '';
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
            
            const iterator = document.evaluate(
                `.//*[${labelsXPath}]`, 
                contextNode, 
                null, 
                XPathResult.ANY_TYPE, 
                null
            );
            
            let node = iterator.iterateNext();
            let checks = 0;
            // Limit checks to prevent infinite loops on large DOMs
            while (node && checks < 15) { // Reduced max checks
                checks++;
                if (checks % 5 === 0) await this.yieldToMain();

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
                     const value = this.extractValueFromNeighbors(node as Element, idRegex);

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
                node = iterator.iterateNext();
            }
        }
        
        await this.yieldToMain();

        // Strategy C: Direct Regex scan on header container
        if (!data.caseNumber) {
            const headerContainer = document.querySelector('[id^="headerContainer"]'); // or outerHeaderContainer_
             if (headerContainer && headerContainer.textContent) {
                 const match = headerContainer.textContent.match(idRegex);
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
        const customerSelector = '[data-id="customerid.fieldControl-LookupResultsDropdown_customerid_SelectedRecordList"]';
        // This observed lookup can sit outside main. Never read its search input or contact-company fields.
        const customerLists = contextNode.querySelectorAll(customerSelector);
        const lists = customerLists.length ? customerLists : document.querySelectorAll(customerSelector);
        const customerNames = new Set<string>();
        let ambiguousCustomer = false;
        for (const list of Array.from(lists).slice(0, 20)) {
            await this.yieldToMain();
            const items = list.querySelectorAll('li');
            if (items.length > 1) ambiguousCustomer = true;
            for (const item of Array.from(items).slice(0, 2)) {
                const displayed = item.cloneNode(true) as Element;
                displayed.querySelectorAll('button, [role="button"], svg, img, input, [hidden], [aria-hidden="true"], [aria-label*="remove" i], [aria-label*="clear" i], [data-id^="customerid.fieldControl-entityIconContainer_"]').forEach(el => el.remove());
                const links = Array.from(displayed.querySelectorAll('a')).map(el => el.textContent?.trim()).filter(Boolean);
                const walker = document.createTreeWalker(displayed, NodeFilter.SHOW_TEXT);
                const leaves: string[] = [];
                let node: Node | null;
                while ((node = walker.nextNode())) {
                    const text = node.textContent?.trim();
                    if (text && !/^(x|\u00d7|remove|clear)$/i.test(text)) leaves.push(text);
                }
                const names = new Set(links.length ? links : leaves);
                if (names.size > 1) ambiguousCustomer = true;
                else names.forEach(name => { if (name) customerNames.add(name); });
            }
        }
        if (!ambiguousCustomer && customerNames.size === 1) {
            const name = customerNames.values().next().value;
            if (name && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name.replace(/^\{(.+)\}$/, '$1'))) {
                data.customerName = name;
            }
        }

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
            if (before === null || (before !== undefined && before !== data.caseNumber)) return null;
            // Unsupported legacy identity keeps DOM data without starting an unbound wait.
            if (before !== undefined) {
                const createdOn = await requestCreatedOn(data.caseNumber);
                if (this.readLiveRecordNumber() !== before) return null;
                if (createdOn) data.createdOn = createdOn;
            }
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
