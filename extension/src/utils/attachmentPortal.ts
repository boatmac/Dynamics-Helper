export type AttachmentPortalAction =
    | { kind: 'inspect' }
    | { kind: 'select_external' }
    | { kind: 'download'; baseUrl: string; filename: string };

export type AttachmentPortalDetail = 'context' | 'document_limit' | 'dialog' | 'case_identity'
    | 'external_control' | 'inventory' | 'file_metadata' | 'page_changed' | 'exception';

export type AttachmentPortalResult =
    | { status: 'unavailable'; detail?: AttachmentPortalDetail }
    | { status: 'workspace_missing' }
    | { status: 'folder_unavailable' }
    | { status: 'external_selectable' }
    | { status: 'clicked' }
    | {
        status: 'ready';
        files: { baseUrl: string; filename: string; workspace: string }[];
        skipped: number;
        inventoryComplete: boolean;
    };

/** Self-contained chrome.scripting MAIN function; the caller must bind documentId
 * and independently validate this untrusted result. Inspection never clicks;
 * external_selectable means the case and unique unselected action are verified.
 * workspace_missing is inspect-only, bound to the full exact dialog case identity;
 * a readable header must agree, but missing/hidden background headers are allowed.
 * its closed status-only result still requires caller-side document binding.
 * folder_unavailable is inspect-only: the fixed empty/permission message does not
 * establish zero files or a missing workspace.
 * skipped counts visible rows omitted from files (including rows beyond 32), not
 * unknown off-page files. inventoryComplete describes enumeration, not eligibility:
 * false means an enabled Next control or the row limit leaves inventory unread.
 * Declared sizes are syntax-checked only; browser actual-size enforcement belongs
 * to the download coordinator. Only explicit actions click; no fetch, pagination
 * action or Chrome API runs here.
 */
export function readAttachmentPortal(
    caseNumber: string,
    action: AttachmentPortalAction = { kind: 'inspect' },
    diagnostics = false,
): AttachmentPortalResult {
    let stage: AttachmentPortalDetail = 'context';
    let inspectDiagnostics = false;
    const unavailable = (): AttachmentPortalResult => inspectDiagnostics
        ? { status: 'unavailable', detail: stage } : { status: 'unavailable' };
    try {
        const portalOrigin = 'https://client.dtmnebula.microsoft.com';
        const apiOrigin = 'https://api.dtmnebula.microsoft.com';
        const ownValue = (object: unknown, key: string): unknown => {
            if (object === null || (typeof object !== 'object' && typeof object !== 'function')) return undefined;
            const descriptor = Object.getOwnPropertyDescriptor(object, key);
            return descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value')
                ? descriptor.value : undefined;
        };
        const kind = ownValue(action, 'kind');
        inspectDiagnostics = diagnostics === true && kind === 'inspect';
        const expectedBase = ownValue(action, 'baseUrl');
        const expectedName = ownValue(action, 'filename');
        const safeFilename = (value: unknown): value is string => typeof value === 'string'
            && value.length > 0 && value.length <= 255 && value === value.trim()
            && !/[\x00-\x1f\x7f/\\]/.test(value)
            && !/(?:\bBearer\s|eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|(?:access_token|sig|token|secret|password)\s*=)/i.test(value);
        if (window.top !== window || window.location.origin !== portalOrigin
            || !window.location.href.startsWith(`${portalOrigin}/`)
            || typeof caseNumber !== 'string' || !/^\d{16}(?:\d{3})?$/.test(caseNumber)
            || !['inspect', 'select_external', 'download'].includes(kind as string)
            || (kind === 'download' && (typeof expectedBase !== 'string'
                || expectedBase.length > 16384 || !safeFilename(expectedName)))) return unavailable();
        const documentUrl = window.location.href;
        const visible = (element: Element): boolean => {
            if (!element.isConnected || !element.getClientRects().length) return false;
            for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
                const style = window.getComputedStyle(ancestor);
                if (ancestor.hasAttribute('hidden') || ancestor.getAttribute('aria-hidden') === 'true'
                    || style.display === 'none' || style.visibility === 'hidden'
                    || style.visibility === 'collapse' || style.opacity === '0') return false;
            }
            return true;
        };
        const boundedText = (element: Element, limit = 100): string | null => {
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_ALL);
            let text = '';
            let rawLength = 0;
            let count = 0;
            let node: Node | null;
            while ((node = walker.nextNode())) {
                if (++count > 128) return null;
                if (node.nodeType !== Node.TEXT_NODE) continue;
                const value = node.nodeValue || '';
                if (value.length > 4096 || (rawLength += value.length) > 8192) return null;
                text += value;
            }
            return text.length <= limit ? text : null;
        };
        const headerText = (element: Element): string | null => {
            const raw = boundedText(element, 8192);
            const text = raw?.replace(/\s+/g, ' ').trim();
            return text !== undefined && text.length <= 100 ? text : null;
        };
        const smallText = (element: Element): string | null => element.children.length <= 3
            ? headerText(element) : null;
        const elements: Element[] = [];
        stage = 'document_limit';
        const tree = document.createTreeWalker(document, NodeFilter.SHOW_ALL);
        let node: Node | null;
        let count = 0;
        while ((node = tree.nextNode())) {
            if (++count > 6000) return unavailable();
            if (node.nodeType === Node.ELEMENT_NODE) elements.push(node as Element);
        }
        stage = 'case_identity';
        const casePattern = /^SR Number\s*:?\s*(\d{16}(?:\d{3})?)(?:\s*\(Active\))?$/;
        const caseLabels = elements.filter(element => visible(element) && casePattern.test(smallText(element) || ''));
        const cases = caseLabels.filter(element => !caseLabels.some(other => other !== element && element.contains(other)));

        stage = 'dialog';
        const dialogs = elements.filter(element => element.matches('dialog[open], [role="dialog"], [role="alertdialog"], [aria-modal="true"]')
            && visible(element));
        if (dialogs.length) {
            if (kind !== 'inspect' || (cases.length > 0
                && (cases.length !== 1 || smallText(cases[0])?.match(casePattern)?.[1] !== caseNumber))) return unavailable();
            const snapshots = dialogs.map(dialog => ({
                dialog,
                text: boundedText(dialog, 8192)?.replace(/\s+/g, ' ').trim(),
                buttons: new Set(elements.filter(element => dialog.contains(element)
                    && element.matches('button, [role="button"]') && visible(element))),
            }));
            // Collapse only equivalent ancestor wrappers of the same modal, never
            // independent dialogs or a wrapper with additional controls/text.
            const minimalDialogs = snapshots.filter(outer => !snapshots.some(inner => inner !== outer
                && outer.dialog.contains(inner.dialog) && outer.text !== undefined && outer.text === inner.text
                && outer.buttons.size === 2 && inner.buttons.size === 2
                && [...outer.buttons].every(button => inner.buttons.has(button))
                && !elements.some(element => outer.dialog.contains(element) && !inner.dialog.contains(element)
                    && element.matches('a[href], button, input, select, textarea, [role="button"], [role="link"], [tabindex], [contenteditable="true"]')
                    && visible(element))));
            if (minimalDialogs.length !== 1) return unavailable();
            const { dialog, text, buttons: buttonSet } = minimalDialogs[0];
            const messagePattern = /^No workspace exists for case (\d{16}(?:\d{3})?)\. Create a workspace for this case\?$/;
            const messages = elements.filter(element => element !== dialog && dialog.contains(element)
                && visible(element) && messagePattern.test(headerText(element) || ''));
            const minimal = messages.filter(element => !messages.some(other => other !== element && element.contains(other)));
            if (minimal.length !== 1 || headerText(minimal[0])?.match(messagePattern)?.[1] !== caseNumber
                || elements.some(element => minimal[0].contains(element) && !visible(element))) return unavailable();
            const buttons = [...buttonSet];
            if (buttons.length !== 2 || buttons.filter(element => headerText(element) === 'Create').length !== 1
                || buttons.filter(element => headerText(element) === 'Cancel').length !== 1
                || elements.some(element => buttons.some(button => button.contains(element)) && !visible(element))) return unavailable();
            // Also reject extra permission/error text, not just a matching nested phrase.
            const fullPattern = /^No workspace exists for case (\d{16}(?:\d{3})?)\. Create a workspace for this case\?\s*(?:Cancel\s*Create|Create\s*Cancel)$/;
            if (text?.match(fullPattern)?.[1] !== caseNumber) return unavailable();
            return { status: 'workspace_missing' };
        }

        stage = 'case_identity';
        if (cases.length !== 1 || smallText(cases[0])?.match(casePattern)?.[1] !== caseNumber) return unavailable();

        stage = 'external_control';
        const tabs = new Set<Element>();
        for (const element of elements) {
            if (element.matches('[role="tab"], a, button, li') && visible(element) && smallText(element) === 'External') {
                tabs.add(element.closest('[role="tab"], li') || element);
            }
        }
        // Collapse only the observed presentation wrapper and its first tab link.
        for (const outer of tabs) {
            if (outer.tagName !== 'LI' || outer.getAttribute('role') !== 'presentation') continue;
            const outerLink = outer.querySelector('a');
            if (!outerLink) continue;
            for (const inner of tabs) {
                if (inner !== outer && inner.getAttribute('role') === 'tab' && inner.closest('li') === outer
                    && outerLink === (inner.matches('a') ? inner : inner.querySelector('a'))) {
                    tabs.delete(outer);
                    break;
                }
            }
        }
        if (tabs.size !== 1) return unavailable();
        const tab = Array.from(tabs)[0];
        const links = tab.matches('a, button') ? [tab] : Array.from(tab.querySelectorAll('a, button'));
        if (links.length !== 1 || !(links[0] instanceof HTMLElement)
            || !visible(links[0]) || smallText(links[0]) !== 'External') return unavailable();
        const tabLink = links[0];
        const wrapper = tab.closest('li[role="presentation"]');
        const markers = [tab, tabLink, ...(wrapper ? [wrapper] : [])];
        const selected = !markers.some(element => element.getAttribute('aria-selected') === 'false')
            && markers.some(element => element.getAttribute('aria-selected') === 'true'
                || ['active', 'selected', 'ui-tabs-active'].some(name => element.classList.contains(name)));
        const disabled = (element: Element): boolean => {
            for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
                if (ancestor.matches(':disabled') || ancestor.hasAttribute('disabled')
                    || ancestor.getAttribute('aria-disabled') === 'true' || ancestor.classList.contains('disabled')) return true;
            }
            return false;
        };
        if (!selected) {
            const target = tabLink.getAttribute('href');
            if (disabled(tabLink) || !(tabLink.tagName === 'BUTTON' || (target !== null && target.startsWith('#')))) return unavailable();
            if (kind === 'inspect') return { status: 'external_selectable' };
            if (kind === 'select_external') {
                tabLink.click();
                // A click acknowledgment is not inventory; require fresh inspection.
                return { status: 'clicked' };
            }
            return unavailable();
        }
        if (kind === 'select_external') return unavailable();
        stage = 'inventory';
        const href = tabLink.getAttribute('href');
        const panelId = tab.getAttribute('aria-controls') || tabLink.getAttribute('aria-controls')
            || (href?.startsWith('#') ? href.slice(1) : null);
        const panels = panelId ? elements.filter(element => element.id === panelId) : [];
        if (panelId && (panels.length !== 1 || !visible(panels[0]))) return unavailable();
        const panel = panels[0];
        const fileHeaderPattern = /^File name(?:\s*[\u2191\u2193])?$/;
        const tables = elements.filter((element): element is HTMLTableElement => element instanceof HTMLTableElement
            && visible(element) && (!panel || panel.contains(element))
            && Array.from(element.rows).some(row => visible(row)
                && Array.from(row.cells).some(cell => fileHeaderPattern.test(headerText(cell) || ''))));
        if (kind === 'inspect' && tables.length === 0) {
            // Without a linked panel, use only the already bounded element snapshot
            // and a unique minimal exact message, never whole-document text.
            const scope = elements.filter(element => (!panel || panel.contains(element)) && visible(element));
            const messages = scope.filter(element => headerText(element)
                === 'No files under this folder. You may not have permission to access this folder.');
            const minimal = messages.filter(element => !messages.some(other => other !== element && element.contains(other)));
            if (minimal.length === 1
                && !elements.some(element => minimal[0].contains(element) && !visible(element))
                && !scope.some(element => element.matches('table, [role="table"], [role="grid"], [role="row"], a[data-bind*="downloadFileClicked"]'))) {
                return { status: 'folder_unavailable' };
            }
        }
        if (tables.length !== 1) return unavailable();
        const table = tables[0];
        const headers = Array.from(table.rows).filter(row => visible(row)
            && Array.from(row.cells).some(cell => fileHeaderPattern.test(headerText(cell) || '')));
        if (headers.length !== 1) return unavailable();
        const names = Array.from(headers[0].cells).map(headerText);
        if (names.filter(name => fileHeaderPattern.test(name || '')).length !== 1
            || names.filter(name => name === 'Size').length !== 1) return unavailable();
        const fileColumn = names.findIndex(name => fileHeaderPattern.test(name || ''));
        const sizeColumn = names.indexOf('Size');
        const rows = Array.from(table.rows).filter(row => row !== headers[0] && visible(row));
        const snapshot = rows.slice(0, 32).map(row => {
            const cell = row.cells[fileColumn];
            const rowLinks = cell ? Array.from(cell.querySelectorAll('a')).filter(link => link.closest('table') === table && visible(link)) : [];
            return { row, links: rowLinks, names: rowLinks.map(link => boundedText(link, 255)?.trim() ?? null) };
        });
        stage = 'file_metadata';
        const ko = ownValue(window, 'ko');
        const contextFor = ownValue(ko, 'contextFor');
        if (rows.length && typeof contextFor !== 'function') return unavailable();
        const eligible: { baseUrl: string; filename: string; workspace: string; link: HTMLAnchorElement }[] = [];
        const observer = new MutationObserver(() => {});
        observer.observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
        let mutated = false;
        try {
            for (const entry of snapshot) {
                const filename = entry.names[0];
                if (entry.links.length !== 1 || !safeFilename(filename)
                    || !/\.(?:png|jpg|jpeg|txt|log|json|xml|csv|md)$/i.test(filename)
                    || snapshot.reduce((total, other) => total + other.names.filter(name => name === filename).length, 0) !== 1) continue;
                const sizeCell = entry.row.cells[sizeColumn];
                const size = sizeCell && headerText(sizeCell);
                const declared = size?.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|KiB|MiB|GiB)$/);
                if (!declared) continue;
                const units: Record<string, number> = { B: 1, KB: 1000, MB: 1000000, GB: 1000000000, KiB: 1024, MiB: 1048576, GiB: 1073741824 };
                const bytes = Number(declared[1]) * units[declared[2]];
                if (!Number.isFinite(bytes) || bytes < 0 || bytes > Number.MAX_SAFE_INTEGER) continue;
                const link = entry.links[0];
                const binding = link.getAttribute('data-bind');
                if (!binding || binding.length > 1000) continue;
                const clauses = binding.split(',');
                const clickBinding = /^\s*(?:click|'click'|"click")\s*:\s*\$root\.downloadFileClicked\s*$/;
                if (clauses.filter(clause => clickBinding.test(clause)).length !== 1
                    || clauses.some(clause => !clickBinding.test(clause)
                        && !/^\s*(?:text|'text'|"text")\s*:\s*(?:\$data\.friendlyName\s*\|\|\s*)?fileName\s*$/.test(clause)
                        && !/^\s*(?:(?:title|'title'|"title")\s*:\s*fileName|(?:attr|'attr'|"attr")\s*:\s*\{\s*(?:title|'title'|"title")\s*:\s*fileName\s*\})\s*$/.test(clause))) continue;
                try {
                    // Only this known locator runs; no model enumeration or observables.
                    const context: unknown = Reflect.apply(contextFor as (...args: unknown[]) => unknown, ko, [link]);
                    const baseUrl = ownValue(ownValue(context, '$data'), 'filePathUri');
                    if (typeof baseUrl !== 'string' || baseUrl.length > 16384
                        || !baseUrl.startsWith(`${apiOrigin}/`) || /[\x00-\x20\x7f\\#]/.test(baseUrl)) continue;
                    const url = new URL(baseUrl);
                    if (url.origin !== apiOrigin || url.username || url.password || url.hash
                        || url.pathname !== baseUrl.slice(apiOrigin.length).split('?', 1)[0]) continue;
                    const rawSegments = url.pathname.split('/');
                    const segments = rawSegments.map(segment => decodeURIComponent(segment));
                    if (segments.some(segment => segment === '.' || segment === '..' || /[\x00-\x20\x7f/\\]/.test(segment))) continue;
                    const markers = segments.flatMap((segment, index) => segment === 'workspaces' ? [index] : []);
                    if (markers.length !== 1) continue;
                    const index = markers[0];
                    const workspace = segments[index + 1];
                    if (rawSegments[index] !== 'workspaces' || rawSegments[index + 1] !== workspace
                        || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(workspace || '')) continue;
                    for (const component of url.search.slice(1).split(/[&=]/)) decodeURIComponent(component.replace(/\+/g, ' '));
                    const query = Array.from(url.searchParams.entries());
                    if (query.length !== 1 || !['fileName', 'filename'].includes(query[0][0]) || query[0][1] !== filename) continue;
                    eligible.push({ baseUrl, filename, workspace, link });
                } catch {
                    // An unreadable row is an omission, never an exception payload.
                }
            }
        } finally {
            mutated = observer.takeRecords().length > 0;
            observer.disconnect();
        }
        // The known locator can run page code. Reject DOM/navigation changes during
        // the snapshot before returning it or causing a click, without a second read.
        stage = 'page_changed';
        if (mutated || window.location.href !== documentUrl || !visible(cases[0])
            || smallText(cases[0])?.match(casePattern)?.[1] !== caseNumber
            || !visible(table) || !visible(tabLink)) return unavailable();
        const files = eligible.slice(0, 4);
        if (kind === 'download') {
            const matches = files.filter(file => file.baseUrl === expectedBase && file.filename === expectedName);
            if (rows.length > 32 || matches.length !== 1 || !visible(matches[0].link) || disabled(matches[0].link)) return unavailable();
            matches[0].link.click();
            return { status: 'clicked' };
        }
        const paginationScope = panel || table.parentElement;
        const nextEnabled = elements.some(element => paginationScope?.contains(element) && visible(element)
            && element.matches('a, button, [role="button"], input')
            && (element.getAttribute('rel')?.split(/\s+/).includes('next')
                || [element.getAttribute('aria-label'), element.getAttribute('title'), smallText(element)]
                    .some(label => /^(?:next|next page)(?:\s*[>\u203a\u00bb])?$/i.test(label?.trim() || ''))
                || element.matches('.next, li.next > a, li.next > button, .paginate_button.next'))
            && !disabled(element));
        return {
            status: 'ready',
            files: files.map(({ baseUrl, filename, workspace }) => ({ baseUrl, filename, workspace })),
            skipped: rows.length - files.length,
            inventoryComplete: rows.length <= 32 && !nextEnabled,
        };
    } catch {
        stage = 'exception';
        return unavailable();
    }
}
