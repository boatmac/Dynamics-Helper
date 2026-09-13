export interface IrSlaSnapshot {
    readonly status: 'Succeeded' | 'unknown';
    readonly capturedAt: string;
}

function renderedParent(element: Element): Element | null {
    if (element.assignedSlot) return element.assignedSlot;
    const root = element.getRootNode();
    return element.parentElement || (root instanceof ShadowRoot ? root.host : null);
}

function isRendered(element: Element): boolean {
    if (!element.isConnected || getComputedStyle(element).visibility !== 'visible') return false;
    // Own visibility can override an ancestor; display:none and opacity:0 cannot.
    let ancestor: Element | null = element;
    for (let depth = 0; ancestor && depth < 64; depth++, ancestor = renderedParent(ancestor)) {
        const style = getComputedStyle(ancestor);
        if (style.display === 'none' || Number.parseFloat(style.opacity) === 0) return false;
    }
    if (ancestor) return false;
    return Array.from(element.getClientRects()).some(rect =>
        Number.isFinite(rect.width) && Number.isFinite(rect.height) && rect.width > 0 && rect.height > 0);
}

function visibleCandidates(scope: ParentNode, selector: string): Element[] {
    const candidates = scope.querySelectorAll(selector);
    if (candidates.length > 20) return [];
    return Array.from(candidates).filter(element =>
        element.getAttribute('aria-hidden') !== 'true' && isRendered(element));
}

function isSummaryTab(tab: Element): boolean {
    if (!tab.hasAttribute('aria-label')) return tab.textContent?.trim() === 'Summary';
    if (tab.getAttribute('aria-label') !== 'Summary' || tab.childNodes.length > 100) return false;
    let directText = '';
    for (const node of tab.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) directText += node.textContent || '';
        if (directText.length > 1000) return false;
    }
    return directText.trim() === 'Summary';
}

function hasCanonicalCase(outer: Element, expectedCase: string): boolean {
    const lists = outer.querySelectorAll('uci-header-control-list');
    if (lists.length > 20) return false;
    const roots: Node[] = Array.from(lists).filter(list =>
        list.closest('[role="tabpanel"], section[aria-label="Summary"]') === outer);
    const seen = new Set<Node>();
    const items: Element[] = [];
    let visited = 0;
    while (roots.length) {
        const root = roots.pop()!;
        if (root instanceof Element && root.shadowRoot) roots.push(root.shadowRoot);
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
            if (seen.has(node)) continue;
            seen.add(node);
            if (++visited > 2000) return false;
            if (!(node instanceof Element)) continue;
            if (node.matches('[role="tabpanel"], section[aria-label="Summary"]')) return false;
            if (node.shadowRoot) roots.push(node.shadowRoot);
            if (node.matches('uci-header-control-list-item[data-name="header_msdfm_casenumberservicelevel"]')) {
                items.push(node);
                if (items.length > 20) return false;
            }
        }
    }
    if (items.length !== 1) return false;
    const values = Array.from(items[0].children).filter(child => child.getAttribute('slot') === 'value');
    if (values.length !== 1 || !isRendered(values[0])) return false;
    // Read only the complete rendered value slot, never title/body or hidden text.
    const walker = document.createTreeWalker(values[0], NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let text = '';
    let node: Node | null;
    while ((node = walker.nextNode())) {
        if (++visited > 2000) return false;
        if (node instanceof Element && (!isRendered(node) || node.shadowRoot)) return false;
        if (node.nodeType === Node.TEXT_NODE) text += node.textContent || '';
        if (text.length > 10000) return false;
    }
    const numbers = text.match(/\b\d{16}(?:\d{3})?\b/g);
    return numbers?.length === 1 && numbers[0] === expectedCase;
}

function recordSummaryPanel(tab: Element, root: Element, expectedCase?: string): Element | null {
    if (!expectedCase || !/^\d{16}(?:\d{3})?$/.test(expectedCase)) return null;
    const mains = visibleCandidates(document, 'main, [role="main"]');
    if (mains.length !== 1) return null;
    const main = mains[0];
    const outers = visibleCandidates(main, '[role="tabpanel"]').filter(panel => {
        const parentPanel = panel.parentElement?.closest('[role="tabpanel"]');
        return (!parentPanel || !main.contains(parentPanel)) && panel.closest('main, [role="main"]') === main;
    });
    if (outers.length !== 1) return null;
    const outer = outers[0];
    if (tab.getAttribute('aria-hidden') === 'true'
        || tab.closest('[role="tabpanel"], section[aria-label="Summary"]') !== outer
        || !hasCanonicalCase(outer, expectedCase)) return null;
    const panelId = tab.getAttribute('aria-controls');
    if (panelId !== null) {
        // Explicit linkage cannot replace record ownership or fall back when invalid.
        if (!panelId || /\s/.test(panelId)) return null;
        const panels = Array.from(document.querySelectorAll('[id]')).filter(candidate => candidate.id === panelId);
        if (panels.length !== 1) return null;
        const panel = panels[0];
        return panel.parentElement?.closest('[role="tabpanel"], section[aria-label="Summary"]') === outer
            ? panel : null;
    }
    if (!tab.matches('li[role="tab"]') || !tab.closest('ul[role="tablist"]')) return null;
    const panels = visibleCandidates(outer, 'div[role="tabpanel"][aria-label="Summary"]')
        .filter(panel => panel.parentElement?.closest('[role="tabpanel"], section[aria-label="Summary"]') === outer);
    if (panels.length !== 1) return null;
    const panel = panels[0];
    const sections = visibleCandidates(panel, '[data-id="Performance_indicators_section"][aria-label="Performance indicators"]')
        .filter(section => section.closest('[role="tabpanel"]') === panel);
    if (sections.length !== 1 || !sections[0].contains(root)) return null;
    return panel;
}

// Terminal-label evidence only, not a countdown or a general SLA-state reader.
// Exact expected-case ownership is required; the caller also revalidates after the read.
export function readIrSla(expectedCase?: string): IrSlaSnapshot | undefined {
    const roots = document.querySelectorAll('[data-id="IR_SLA_Timer"][data-control-name="IR_SLA_Timer"]');
    if (!roots.length) return undefined;
    const capturedAt = new Date().toISOString();
    const unknown: IrSlaSnapshot = { status: 'unknown', capturedAt };
    if (roots.length !== 1) return unknown;
    const candidates = document.querySelectorAll('[role="tab"][aria-selected="true"]');
    if (candidates.length > 20) return unknown;
    const tabs = Array.from(candidates).filter(tab => isSummaryTab(tab) && isRendered(tab));
    if (tabs.length !== 1) return unknown;
    const panel = recordSummaryPanel(tabs[0], roots[0], expectedCase);
    if (!panel) return unknown;
    if (!panel.matches('[role="tabpanel"], section[aria-label="Summary"]')
        || panel.getAttribute('aria-hidden') === 'true' || !isRendered(panel)
        || roots[0].closest('[role="tabpanel"], section[aria-label="Summary"]') !== panel) return unknown;
    const labels = roots[0].querySelectorAll('[data-id="IR_SLA_Timer.fieldControl-SucceededLabelId"]');
    if (labels.length !== 1) return unknown;
    const label = labels[0];
    if (label.textContent?.trim() !== 'Succeeded'
        || label.closest('[role="tabpanel"], section[aria-label="Summary"]') !== panel) return unknown;
    // aria-hidden on the observed terminal label does not determine CSS rendering.
    return isRendered(label) ? { status: 'Succeeded', capturedAt } : unknown;
}
