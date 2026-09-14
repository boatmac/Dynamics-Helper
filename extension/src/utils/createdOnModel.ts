export type CreatedOnResult =
    | { status: 'ok'; caseNumber: string; createdOnUtc: string }
    | { status: 'unavailable' }

// Chrome serializes this function: all runtime dependencies must stay inside it.
export async function readCurrentRecordCreatedOn(expected: string): Promise<CreatedOnResult> {
    const unavailable = { status: 'unavailable' } as const
    const origin = 'https://onesupport.crm.dynamics.com'
    const exactNumber = /^\d{16}(?:\d{3})?$/
    const compositeNumber = (value: unknown): string | undefined => {
        if (typeof value !== 'string') return undefined
        const numbers = new Set(value.match(/\b\d{16}(?:\d{3})?\b/g) || [])
        return numbers.size === 1 ? [...numbers][0] : undefined
    }
    type Form = {
        data: { entity: { getId(): unknown; getEntityName(): unknown } }
        getAttribute(name: string): { getValue(): unknown } | null
    }
    const currentForm = () => (window as unknown as { Xrm?: { Page?: Form } }).Xrm?.Page
    const snapshot = () => {
        const form = currentForm()
        if (!form || form.data.entity.getEntityName() !== 'incident') return undefined
        const id = form.data.entity.getId()
        if (typeof id !== 'string' || !/^(?:[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}|\{[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\})$/i.test(id)) return undefined
        const ticket = form.getAttribute('ticketnumber')?.getValue()
        const number = typeof ticket === 'string' && exactNumber.test(ticket.trim()) && ticket.trim() === expected
            ? ticket.trim()
            : compositeNumber(form.getAttribute('msdfm_casenumberservicelevel')?.getValue())
        if (number !== expected) return undefined
        const date = form.getAttribute('createdon')?.getValue()
        // Intrinsics accept genuine foreign-realm Dates and reject date-like objects.
        const time = Date.prototype.getTime.call(date)
        if (!Number.isFinite(time)) return undefined
        const iso = Date.prototype.toISOString.call(date)
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(iso)) return undefined
        return { id, number, time, iso }
    }
    const displayedNumber = async () => {
        const headers = document.querySelectorAll('uci-header-control-list')
        if (headers.length > 20) return undefined
        const roots: Node[] = Array.from(headers)
        const seen = new Set<Node>()
        const lists = new Set<Element>(headers)
        const items: Element[] = []
        let nodes = 0
        let work = 0
        let textSize = 0
        const deadline = Date.now() + 1000
        const spend = () => ++work <= 12000 && Date.now() <= deadline
        const text = (root: Element): string | undefined => {
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
            let result = ''
            let node: Node | null
            while ((node = walker.nextNode())) {
                if (++nodes > 2000 || !spend()) return undefined
                if (node.nodeType !== Node.TEXT_NODE) continue
                const leaf = node as Text
                if (leaf.length > 10000 - textSize) return undefined
                textSize += leaf.length
                result += leaf.data
            }
            return result
        }
        while (roots.length) {
            const root = roots.pop()!
            if (++nodes > 2000 || !spend()) return undefined
            if (root instanceof Element && root.shadowRoot) roots.push(root.shadowRoot)
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
            let node: Element | null
            while ((node = walker.nextNode() as Element | null)) {
                // Attempts through overlapping roots count even when already seen.
                if (++nodes > 2000 || !spend()) return undefined
                if (nodes % 50 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0))
                    if (Date.now() > deadline) return undefined
                }
                if (seen.has(node)) continue
                seen.add(node)
                if (node.shadowRoot) roots.push(node.shadowRoot)
                if (node.localName === 'uci-header-control-list') {
                    lists.add(node)
                    if (lists.size > 20) return undefined
                }
                if (node.localName !== 'uci-header-control-list-item') continue
                items.push(node)
            }
        }
        // Read live slot values only after the last yield, not a pre-yield identity.
        const numbers = new Set<string>()
        for (const item of items) {
            if (!spend()) return undefined
            if (!item.isConnected) continue
            const children: Element[] = []
            let label: string | undefined
            for (const child of item.children) {
                if (++nodes > 2000 || !spend()) return undefined
                children.push(child)
                if (child.getAttribute('slot') === 'label' && label === undefined) {
                    const value = text(child)
                    if (value === undefined) return undefined
                    label = value.replace(/\s+/g, ' ').trim().toLowerCase()
                }
            }
            if (item.getAttribute('data-name') !== 'header_msdfm_casenumberservicelevel' && label !== 'case number / service name') continue
            for (const value of children.filter(el => el.getAttribute('slot') === 'value')) {
                if (!spend()) return undefined
                if (!value.getClientRects().length) continue
                if (!spend()) return undefined
                const style = getComputedStyle(value)
                if (style.visibility !== 'visible' || style.display === 'none' || style.opacity === '0') continue
                let visible = true
                let ancestor: Element | null = value
                let depth = 0
                while (ancestor) {
                    if (++depth > 64 || !spend()) return undefined
                    const ancestorStyle = getComputedStyle(ancestor)
                    if (ancestorStyle.display === 'none' || ancestorStyle.opacity === '0') { visible = false; break }
                    const tree = ancestor.getRootNode()
                    ancestor = ancestor.assignedSlot || ancestor.parentElement || (tree instanceof ShadowRoot ? tree.host : null)
                }
                if (!visible) continue
                const valueText = text(value)
                if (valueText === undefined) return undefined
                const matches = valueText.match(/\b\d{16}(?:\d{3})?\b/g) || []
                matches.forEach(number => numbers.add(number))
            }
        }
        return spend() && numbers.size === 1 ? [...numbers][0] : undefined
    }
    try {
        if (location.origin !== origin || typeof expected !== 'string' || !exactNumber.test(expected)) return unavailable
        const before = snapshot()
        if (!before || await displayedNumber() !== expected) return unavailable
        if (await displayedNumber() !== expected || location.origin !== origin) return unavailable
        const after = snapshot()
        if (!after || before.id !== after.id || before.number !== after.number || before.time !== after.time) return unavailable
        return { status: 'ok', caseNumber: expected, createdOnUtc: before.iso }
    } catch {
        return unavailable
    }
}
