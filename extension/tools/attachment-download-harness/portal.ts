/** MAIN-world diagnostic only. The controller must bind documentId and independently
 * validate the credential-free result before giving it to its download matcher.
 * Keep every dependency inside this function so scripting can serialize it.
 */
export function inspectPortal(
    caseNumber: string,
    workspace: string,
    filename: string,
    expectedBaseUrl: string | null = null,
): { status: 'unavailable' } | { status: 'ready'; baseUrl: string } | { status: 'clicked' } {
    try {
        const unavailable = { status: 'unavailable' } as const;
        const portalOrigin = 'https://client.dtmnebula.microsoft.com';
        const apiOrigin = 'https://api.dtmnebula.microsoft.com';
        if (window.top !== window || window.location.origin !== portalOrigin
            || !window.location.href.startsWith(`${portalOrigin}/`)
            || typeof caseNumber !== 'string' || !/^\d{16}(?:\d{3})?$/.test(caseNumber)
            || typeof workspace !== 'string'
            || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(workspace)
            || typeof filename !== 'string' || !filename || filename.length > 255
            || filename !== filename.trim() || /[\x00-\x1f\x7f/\\]/.test(filename)
            || (expectedBaseUrl !== null && typeof expectedBaseUrl !== 'string')) return unavailable;

        const ownValue = (object: unknown, key: string): unknown => {
            if (object === null || (typeof object !== 'object' && typeof object !== 'function')) return undefined;
            const descriptor = Object.getOwnPropertyDescriptor(object, key);
            return descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value')
                ? descriptor.value : undefined;
        };
        const visible = (element: Element): boolean => {
            if (!element.getClientRects().length) return false;
            for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
                const style = window.getComputedStyle(ancestor);
                if (ancestor.hasAttribute('hidden') || ancestor.getAttribute('aria-hidden') === 'true'
                    || style.display === 'none' || style.visibility === 'hidden'
                    || style.visibility === 'collapse' || style.opacity === '0') return false;
            }
            return true;
        };
        const smallText = (element: Element): string | null => {
            if (element.children.length > 3) return null;
            // Structural labels are capped at 100 characters; filename links use
            // the separate 255-character input limit and exact comparison below.
            // Do not materialize an unbounded subtree's textContent.
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
            let text = '';
            let node: Node | null;
            while ((node = walker.nextNode())) {
                const value = node.nodeValue || '';
                if (text.length + value.length > 100) return null;
                text += value;
            }
            return text.replace(/\s+/g, ' ').trim();
        };
        const headerText = (element: Element): string | null => {
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_ALL);
            let text = '';
            let rawLength = 0;
            let count = 0;
            let node: Node | null;
            while ((node = walker.nextNode())) {
                if (++count > 128) return null;
                if (node.nodeType !== Node.TEXT_NODE) continue;
                const value = node.nodeValue || '';
                if (value.length > 4096 || rawLength + value.length > 8192) return null;
                rawLength += value.length;
                // Preserve adjacent text boundaries; trim only the aggregate.
                text = (text + value.replace(/\s+/g, ' ')).replace(/\s+/g, ' ');
                if (text.trim().length > 100) return null;
            }
            return text.trim();
        };

        const elements: Element[] = [];
        const tree = document.createTreeWalker(document, NodeFilter.SHOW_ALL);
        let node: Node | null;
        let count = 0;
        while ((node = tree.nextNode())) {
            if (++count > 6000) return unavailable;
            if (node.nodeType === Node.ELEMENT_NODE) elements.push(node as Element);
        }
        if (elements.some(element => element.matches('dialog[open], [role="dialog"], [role="alertdialog"], [aria-modal="true"]')
            && visible(element))) return unavailable;

        const caseLabelPattern = /^SR Number\s*:?\s*(\d{16}(?:\d{3})?)(?:\s*\(Active\))?$/;
        const caseLabels = elements.filter(element => {
            if (!visible(element)) return false;
            const text = smallText(element);
            return text !== null && caseLabelPattern.test(text);
        });
        // A label's wrappers are not independent occurrences of the same case.
        const cases = caseLabels.filter(element => !caseLabels.some(other => other !== element && element.contains(other)));
        if (cases.length !== 1
            || smallText(cases[0])?.match(caseLabelPattern)?.[1] !== caseNumber) return unavailable;

        const tabs = new Set<Element>();
        for (const element of elements) {
            if (!element.matches('[role="tab"], a, button, li') || smallText(element) !== 'External'
                || !visible(element)) continue;
            const tab = element.closest('[role="tab"], li') || element;
            if (tab.getAttribute('aria-selected') === 'false') continue;
            if (tab.getAttribute('aria-selected') === 'true' || element.getAttribute('aria-selected') === 'true'
                || ['active', 'selected', 'ui-tabs-active'].some(name => tab.classList.contains(name) || element.classList.contains(name))) {
                tabs.add(tab);
            }
        }
        // The selected presentation wrapper and its nested tab can be one visual tab.
        for (const outer of tabs) {
            if (outer.tagName !== 'LI' || outer.getAttribute('role') !== 'presentation'
                || !['active', 'selected', 'ui-tabs-active'].some(name => outer.classList.contains(name))) continue;
            const outerLink = outer.querySelector('a');
            if (!outerLink) continue;
            for (const inner of tabs) {
                if (inner.getAttribute('role') !== 'tab' || !outer.contains(inner) || inner.closest('li') !== outer) continue;
                if (outerLink !== (inner.matches('a') ? inner : inner.querySelector('a'))) continue;
                tabs.delete(outer);
                break;
            }
        }
        if (tabs.size !== 1) return unavailable;
        const tab = Array.from(tabs)[0];
        const tabLink = tab.matches('a') ? tab : tab.querySelector('a');
        const href = tabLink?.getAttribute('href');
        const panelId = tab.getAttribute('aria-controls') || tabLink?.getAttribute('aria-controls')
            || (href?.startsWith('#') ? href.slice(1) : null);
        const panel = panelId ? document.getElementById(panelId) : null;
        if (panelId && (!panel || !visible(panel))) return unavailable;

        const fileHeaderPattern = /^File name(?:\s*[\u2191\u2193])?$/;
        const matches: HTMLAnchorElement[] = [];
        for (const element of elements) {
            if (!(element instanceof HTMLTableElement) || !visible(element) || (panel && !panel.contains(element))) continue;
            const headers = Array.from(element.rows).filter(row => {
                const names = Array.from(row.cells).map(cell => headerText(cell));
                return names.filter(name => name !== null && fileHeaderPattern.test(name)).length === 1
                    && names.filter(name => name === 'Size').length === 1 && visible(row);
            });
            if (headers.length !== 1) continue;
            const fileColumn = Array.from(headers[0].cells).findIndex(cell => fileHeaderPattern.test(headerText(cell) || ''));
            for (const row of Array.from(element.rows)) {
                if (row === headers[0] || !visible(row)) continue;
                const cell = row.cells[fileColumn];
                if (!cell) continue;
                for (const link of Array.from(cell.querySelectorAll('a'))) {
                    if (link.closest('table') !== element || !visible(link) || link.textContent?.trim() !== filename) continue;
                    // Count identity matches before validating bindings: an invalid twin is still ambiguous.
                    matches.push(link);
                }
            }
        }
        if (matches.length !== 1) return unavailable;
        const link = matches[0];
        const binding = link.getAttribute('data-bind');
        if (!binding || binding.length > 1000) return unavailable;
        const clauses = binding.split(',');
        const clickBinding = /^\s*(?:click|'click'|"click")\s*:\s*\$root\.downloadFileClicked\s*$/;
        // Only observed static display expressions may accompany the exact handler.
        // Quotes may wrap known keys only, never expressions or handler calls.
        if (clauses.filter(clause => clickBinding.test(clause)).length !== 1
            || clauses.some(clause => !clickBinding.test(clause)
                && !/^\s*(?:text|'text'|"text")\s*:\s*(?:\$data\.friendlyName\s*\|\|\s*)?fileName\s*$/.test(clause)
                && !/^\s*(?:(?:title|'title'|"title")\s*:\s*fileName|(?:attr|'attr'|"attr")\s*:\s*\{\s*(?:title|'title'|"title")\s*:\s*fileName\s*\})\s*$/.test(clause))) return unavailable;

        // Only the known Knockout locator runs. Never enumerate the model or invoke observables/getters.
        const ko = ownValue(window, 'ko');
        const contextFor = ownValue(ko, 'contextFor');
        if (typeof contextFor !== 'function') return unavailable;
        const context: unknown = Reflect.apply(contextFor, ko, [link]);
        const baseUrl = ownValue(ownValue(context, '$data'), 'filePathUri');
        if (typeof baseUrl !== 'string' || baseUrl.length > 16384
            || !baseUrl.startsWith(`${apiOrigin}/`) || /[\x00-\x20\x7f\\#]/.test(baseUrl)) return unavailable;
        const url = new URL(baseUrl);
        if (url.origin !== apiOrigin || url.username || url.password || url.hash) return unavailable;
        const rawPath = baseUrl.slice(apiOrigin.length).split('?', 1)[0];
        if (url.pathname !== rawPath) return unavailable;
        const segments = url.pathname.split('/').map(segment => decodeURIComponent(segment));
        if (!segments.includes(workspace) || segments.some(segment => segment === '.' || segment === '..'
            || /[\x00-\x20\x7f/\\]/.test(segment))) return unavailable;
        for (const component of url.search.slice(1).split(/[&=]/)) decodeURIComponent(component.replace(/\+/g, ' '));
        // An allowlist, not a guess that arbitrary query values are free of credentials.
        const query = Array.from(url.searchParams.entries());
        if (query.length !== 1 || !['fileName', 'filename'].includes(query[0][0]) || query[0][1] !== filename
            || /(?:\bBearer\s|eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|(?:access_token|sig|token|secret|password)\s*=)/i.test(query[0][1])) return unavailable;
        if (expectedBaseUrl === null) return { status: 'ready', baseUrl };
        if (baseUrl !== expectedBaseUrl || !link.isConnected || !visible(link)) return unavailable;
        link.click();
        return { status: 'clicked' };
    } catch {
        return { status: 'unavailable' };
    }
}
