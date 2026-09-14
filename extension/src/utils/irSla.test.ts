import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readIrSla } from './irSla'

describe('observed terminal IR SLA label', () => {
    const capturedAt = '2031-04-17T10:23:00.123Z'
    const expectedCase = '2601190030003106001'
    const rootMarkup = '<div data-id="IR_SLA_Timer" data-control-name="IR_SLA_Timer"><span data-id="IR_SLA_Timer.fieldControl-SucceededLabelId" aria-hidden="true" style="visibility:visible">Succeeded</span></div>'
    const label = () => document.querySelector('[data-id="IR_SLA_Timer.fieldControl-SucceededLabelId"]')!
    const root = () => document.querySelector('[data-id="IR_SLA_Timer"]')!

    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date(capturedAt))
        recordPane()
        document.querySelector('[role="tablist"]')!.outerHTML = '<button role="tab" aria-selected="true" aria-controls="summary-panel" style="visibility:visible">Summary</button>'
        document.querySelector('#summary')!.id = 'summary-panel'
        vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue([
            { width: 80, height: 20, x: -5000, y: 9000, top: 9000, bottom: 9020, left: -5000, right: -4920 },
        ] as unknown as DOMRectList)
    })
    afterEach(() => {
        document.body.replaceChildren()
        vi.restoreAllMocks()
        vi.useRealTimers()
    })

    it('captures literal Succeeded offscreen despite aria-hidden, as UTC at read time', () => {
        const snapshot = readIrSla(expectedCase)
        expect(snapshot).toEqual({ status: 'Succeeded', capturedAt })
        label().textContent = 'Expired'
        vi.setSystemTime(new Date('2031-04-18T00:00:00.000Z'))
        expect(snapshot).toEqual({ status: 'Succeeded', capturedAt })
        expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt: '2031-04-18T00:00:00.000Z' })
    })

    it.each(['', 'succeeded', 'Not Succeeded', 'Succeeded pending', '01:23:45', 'Paused', 'Expired'])('does not infer a state from %j', text => {
        label().textContent = text
        expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
    })

    it.each(['label', 'root', 'ancestor'])('rejects display:none and opacity:0 on %s', target => {
        const element = target === 'label' ? label() : target === 'root' ? root() : document.querySelector('section')!
        for (const style of ['display:none', 'opacity:0']) {
            element.setAttribute('style', `${style};visibility:visible`)
            expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
        }
    })

    it('allows own visibility to override hidden ancestors but not hidden own visibility', () => {
        document.querySelector('section')!.setAttribute('style', 'visibility:hidden')
        expect(readIrSla(expectedCase)).toEqual({ status: 'Succeeded', capturedAt })
        for (const visibility of ['hidden', 'collapse']) {
            label().setAttribute('style', `visibility:${visibility}`)
            expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
        }
    })

    it.each([[0, 20], [80, 0], [-1, 20], [NaN, 20], [80, Infinity]])('rejects nonpositive/nonfinite geometry %s x %s', (width, height) => {
        vi.spyOn(label(), 'getClientRects').mockReturnValue([{ width, height }] as unknown as DOMRectList)
        expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
    })

    it('rejects an empty rectangle list', () => {
        vi.spyOn(label(), 'getClientRects').mockReturnValue([] as unknown as DOMRectList)
        expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
    })

    it.each(['missing', 'wrong-control', 'wrong-id', 'shadow'])('omits absent/unsupported root sources: %s', mode => {
        if (mode === 'missing') root().remove()
        if (mode === 'wrong-control') root().setAttribute('data-control-name', 'Other_Timer')
        if (mode === 'wrong-id') root().setAttribute('data-id', 'Other_Timer')
        if (mode === 'shadow') {
            document.body.replaceChildren()
            const host = document.createElement('div')
            document.body.append(host)
            host.attachShadow({ mode: 'open' }).innerHTML = rootMarkup
        }
        expect(readIrSla(expectedCase)).toBeUndefined()
    })

    it.each(['outside', 'missing', 'duplicate-label', 'duplicate-root'])('does not recognize ambiguous or unbound labels: %s', mode => {
        if (mode === 'outside') document.body.append(label())
        if (mode === 'missing') label().remove()
        if (mode === 'duplicate-label') root().append(label().cloneNode(true))
        if (mode === 'duplicate-root') document.body.insertAdjacentHTML('beforeend', rootMarkup)
        expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
    })

    it.each(['outside', 'inactive-pane', 'nested-inactive-pane'])('rejects even a unique timer in a foreign source: %s', mode => {
        const timer = root()
        if (mode === 'outside') document.body.append(timer)
        else {
            const inactive = document.createElement('div')
            inactive.setAttribute('role', 'tabpanel')
            inactive.setAttribute('aria-hidden', 'true')
            inactive.id = 'inactive-summary'
            const parent = mode === 'nested-inactive-pane' ? document.querySelector('#summary-panel')! : document.body
            parent.append(inactive)
            inactive.append(timer)
        }
        expect(document.querySelectorAll('[data-id="IR_SLA_Timer"]')).toHaveLength(1)
        expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
    })

    it.each(['missing-tab', 'inactive-tab', 'wrong-label', 'missing-controls', 'wrong-controls', 'multiple-controls', 'duplicate-tab', 'duplicate-panel', 'inactive-panel'])('requires an unambiguous active Summary relation: %s', mode => {
        const tab = document.querySelector('[role="tab"]')!
        const panel = document.querySelector('#summary-panel')!
        if (mode === 'missing-tab') tab.remove()
        if (mode === 'inactive-tab') tab.setAttribute('aria-selected', 'false')
        if (mode === 'wrong-label') tab.textContent = 'Summary Details'
        if (mode === 'missing-controls') tab.removeAttribute('aria-controls')
        if (mode === 'wrong-controls') tab.setAttribute('aria-controls', 'other-panel')
        if (mode === 'multiple-controls') tab.setAttribute('aria-controls', 'summary-panel other-panel')
        if (mode === 'duplicate-tab') document.body.append(tab.cloneNode(true))
        if (mode === 'duplicate-panel') {
            const duplicate = document.createElement('div')
            duplicate.id = panel.id
            duplicate.setAttribute('role', 'tabpanel')
            document.body.append(duplicate)
        }
        if (mode === 'inactive-panel') panel.setAttribute('aria-hidden', 'true')
        expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
    })

    it.each(['tab', 'tabpanel'])('requires rendered %s authority with bounded CSS checks and geometry', role => {
        const authority = document.querySelector(role === 'tab' ? '[role="tab"]' : '#summary-panel')!
        const wrapper = document.createElement('div')
        authority.before(wrapper)
        wrapper.append(authority)
        for (const style of ['display:none', 'opacity:0']) {
            wrapper.setAttribute('style', style)
            expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
        }
        wrapper.removeAttribute('style')
        authority.setAttribute('style', 'visibility:hidden')
        expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
        authority.setAttribute('style', 'visibility:visible')
        vi.spyOn(authority, 'getClientRects').mockReturnValue([] as unknown as DOMRectList)
        expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
    })

    it('accepts a Summary section only with the explicit active-tab relation', () => {
        const panel = document.querySelector('#summary-panel')!
        const section = document.createElement('section')
        section.id = panel.id
        section.setAttribute('aria-label', 'Summary')
        section.setAttribute('style', 'visibility:visible')
        section.append(root())
        panel.replaceWith(section)
        expect(readIrSla(expectedCase)).toEqual({ status: 'Succeeded', capturedAt })
        document.querySelector('[role="tab"]')!.removeAttribute('aria-controls')
        expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
    })

    it('fails closed when the ancestry bound cannot establish rendering', () => {
        const timer = root()
        let parent = document.querySelector('section')!
        for (let depth = 0; depth < 64; depth++) {
            const wrapper = document.createElement('div')
            parent.append(wrapper)
            parent = wrapper
        }
        parent.append(timer)
        const styles = vi.spyOn(window, 'getComputedStyle')
        expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
        expect(styles.mock.calls.length).toBeLessThanOrEqual(3 * 65)
    })

    function recordPane(number = expectedCase) {
        document.body.innerHTML = `<main role="main"><div id="record" role="tabpanel"><uci-header-control-list><uci-header-control-list-item data-name="header_msdfm_casenumberservicelevel"><span slot="label">Case number / Service name</span><span slot="value" aria-hidden="true">${number} | Synthetic service</span></uci-header-control-list-item></uci-header-control-list><ul role="tablist"><li role="tab" aria-selected="true" aria-label="Summary">Summary<div>Aggregate decorative junk</div></li></ul><div id="summary" role="tabpanel" aria-label="Summary"><section data-id="Performance_indicators_section" aria-label="Performance indicators">${rootMarkup}</section></div></div></main>`
    }

    it.each([expectedCase, expectedCase.slice(0, 16)])('binds an explicit button tab to exact canonical case %s without fallback anchors', number => {
        document.querySelector('[slot="value"]')!.textContent = `${number} | Synthetic service`
        document.querySelector('section')!.replaceWith(root())
        expect(document.querySelector('button[role="tab"]')).not.toBeNull()
        expect(readIrSla(number)).toEqual({ status: 'Succeeded', capturedAt })
    })

    it.each([undefined, '', 'WO-12345', ` ${expectedCase}`, expectedCase.slice(0, 16), '2601190030003106002'])('rejects explicit expected case %j', number => {
        expect(readIrSla(number)).toEqual({ status: 'unknown', capturedAt })
    })

    it('rejects an explicitly linked foreign record even when its terminal label is rendered', () => {
        document.querySelector('[slot="value"]')!.textContent = '2601190030003106002 | Synthetic service'
        expect(getComputedStyle(label()).visibility).toBe('visible')
        expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
    })

    it.each(['missing-main', 'multiple-main', 'multiple-outer', 'missing-header', 'header-in-summary', 'foreign-tab', 'foreign-panel', 'nested-tab', 'nested-panel', 'nested-pair', 'inactive-outer', 'hidden-tab'])('rejects unbound explicit record ownership: %s', mode => {
        const main = document.querySelector('main')!
        const outer = document.querySelector('#record')!
        const panel = document.querySelector('#summary-panel')!
        const tab = document.querySelector('[role="tab"]')!
        const header = document.querySelector('uci-header-control-list')!
        if (mode === 'missing-main') main.replaceWith(...Array.from(main.childNodes))
        if (mode === 'multiple-main') document.body.insertAdjacentHTML('beforeend', '<main></main>')
        if (mode === 'multiple-outer') main.insertAdjacentHTML('beforeend', '<div role="tabpanel"></div>')
        if (mode === 'missing-header') header.remove()
        if (mode === 'header-in-summary') panel.prepend(header)
        if (mode === 'foreign-tab' || mode === 'foreign-panel') {
            document.body.insertAdjacentHTML('beforeend', '<div id="foreign" role="tabpanel"></div>')
            document.querySelector('#foreign')!.append(mode === 'foreign-tab' ? tab : panel)
        }
        if (mode.startsWith('nested-')) {
            const nested = document.createElement('div')
            nested.setAttribute('role', 'tabpanel')
            outer.append(nested)
            if (mode !== 'nested-panel') nested.append(tab)
            if (mode !== 'nested-tab') nested.append(panel)
        }
        if (mode === 'inactive-outer') {
            outer.setAttribute('aria-hidden', 'true')
            outer.setAttribute('style', 'display:block;visibility:visible;opacity:1')
            expect(getComputedStyle(label()).visibility).toBe('visible')
        }
        if (mode === 'hidden-tab') tab.setAttribute('aria-hidden', 'true')
        expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
    })

    it('does not use a Summary section header as outer record authority', () => {
        const panel = document.querySelector('#summary-panel')!
        const section = document.createElement('section')
        section.id = panel.id
        section.setAttribute('aria-label', 'Summary')
        section.append(document.querySelector('uci-header-control-list')!, root())
        panel.replaceWith(section)
        expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
    })

    it.each([expectedCase, expectedCase.slice(0, 16)])('binds the compressed Summary fallback to exact canonical case %s', number => {
        recordPane(number)
        expect(readIrSla(number)).toEqual({ status: 'Succeeded', capturedAt })
    })

    it.each([undefined, '', 'WO-12345', ` ${expectedCase}`, expectedCase.slice(0, 16), '2601190030003106002'])('rejects fallback expected case %j', number => {
        recordPane()
        expect(readIrSla(number)).toEqual({ status: 'unknown', capturedAt })
    })

    it.each(['', 'missing', 'summary other', 'record'])('does not fall back from present invalid or mismatched aria-controls %j', controls => {
        recordPane()
        document.querySelector('[role="tab"]')!.setAttribute('aria-controls', controls)
        expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
    })

    it.each(['explicit', 'fallback'])('accepts exact aria-label and direct Summary text despite decorative children: %s', mode => {
        if (mode === 'fallback') recordPane()
        const tab = document.querySelector('[role="tab"]')!
        tab.setAttribute('aria-label', 'Summary')
        tab.innerHTML = ' Summary <div>Aggregate decorative junk</div>'
        expect(readIrSla(expectedCase)).toEqual({ status: 'Succeeded', capturedAt })
        tab.innerHTML = 'Details<div>Summary</div>'
        expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
    })

    it.each(['missing-main', 'multiple-main', 'multiple-outer', 'multiple-summary', 'multiple-tab', 'foreign-tab', 'header-outside', 'header-in-summary', 'wrong-header', 'duplicate-header', 'wrong-performance-id', 'wrong-performance-label', 'outside-performance', 'nested-inactive-root', 'nested-inactive-label', 'inactive-outer', 'inactive-summary', 'inactive-tab'])('rejects unbound fallback structure: %s', mode => {
        recordPane()
        const main = document.querySelector('main')!
        const outer = document.querySelector('#record')!
        const summary = document.querySelector('#summary')!
        const tab = document.querySelector('[role="tab"]')!
        const header = document.querySelector('uci-header-control-list')!
        const performance = document.querySelector('section')!
        if (mode === 'missing-main') main.replaceWith(...Array.from(main.childNodes))
        if (mode === 'multiple-main') document.body.insertAdjacentHTML('beforeend', '<main role="main"></main>')
        if (mode === 'multiple-outer') main.insertAdjacentHTML('beforeend', '<div role="tabpanel"></div>')
        if (mode === 'multiple-summary') outer.insertAdjacentHTML('beforeend', '<div role="tabpanel" aria-label="Summary"></div>')
        if (mode === 'multiple-tab') tab.after(tab.cloneNode(true))
        if (mode === 'foreign-tab') {
            document.body.insertAdjacentHTML('beforeend', '<div id="foreign" role="tabpanel"></div>')
            document.querySelector('#foreign')!.append(tab.parentElement!)
        }
        if (mode === 'header-outside') main.prepend(header)
        if (mode === 'header-in-summary') summary.prepend(header)
        if (mode === 'wrong-header') header.firstElementChild!.setAttribute('data-name', 'header_ticketnumber')
        if (mode === 'duplicate-header') header.after(header.cloneNode(true))
        if (mode === 'wrong-performance-id') performance.setAttribute('data-id', 'Other_section')
        if (mode === 'wrong-performance-label') performance.setAttribute('aria-label', 'Other indicators')
        if (mode === 'outside-performance') summary.append(root())
        if (mode.startsWith('nested-inactive')) {
            const inactive = document.createElement('div')
            inactive.setAttribute('role', 'tabpanel')
            inactive.setAttribute('aria-hidden', 'true')
            const target = mode === 'nested-inactive-root' ? root() : root().firstElementChild!
            target.before(inactive)
            inactive.append(target)
        }
        if (mode === 'inactive-outer') outer.setAttribute('aria-hidden', 'true')
        if (mode === 'inactive-summary') summary.setAttribute('aria-hidden', 'true')
        if (mode === 'inactive-tab') tab.setAttribute('aria-selected', 'false')
        expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
    })

    it.each(['main', '#record', '#summary', '[role="tab"]', 'section', '[slot="value"]'])('requires rendered fallback authority %s', selector => {
        recordPane()
        for (const style of ['display:none', 'opacity:0', 'visibility:hidden']) {
            document.querySelector(selector)!.setAttribute('style', style)
            expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
        }
    })

    it.each(['wrong', 'multiple', 'hidden-child', 'title-only', 'oversized'])('rejects unsafe canonical slot value: %s', mode => {
        recordPane()
        const value = document.querySelector('[slot="value"]')!
        if (mode === 'wrong') value.textContent = expectedCase.slice(0, 16)
        if (mode === 'multiple') value.textContent += ' 2601190030003106002'
        if (mode === 'hidden-child') value.innerHTML = `<span style="display:none">${expectedCase}</span>`
        if (mode === 'title-only') {
            value.textContent = ''
            value.setAttribute('title', expectedCase)
        }
        if (mode === 'oversized') value.append('x'.repeat(10001))
        expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
    })

    it('reads open roots only under the contained known header list and checks host rendering', () => {
        recordPane()
        const header = document.querySelector('uci-header-control-list')!
        const item = header.firstElementChild!
        const host = document.createElement('div')
        header.append(host)
        host.attachShadow({ mode: 'open' }).append(item)
        expect(readIrSla(expectedCase)).toEqual({ status: 'Succeeded', capturedAt })
        host.style.display = 'none'
        expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
    })

    it('checks projected ancestor opacity for a slotted canonical header value', () => {
        recordPane()
        const value = document.querySelector('[slot="value"]')!
        const shadow = value.parentElement!.attachShadow({ mode: 'open' })
        shadow.innerHTML = '<div style="opacity:0"><slot name="value"></slot></div>'
        expect(value.assignedSlot).toBe(shadow.querySelector('slot'))
        expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
        shadow.querySelector('div')!.style.opacity = '1'
        // jsdom does not invalidate cached shadow styles on shadow-only mutations.
        shadow.host.setAttribute('data-test-style-revision', '1')
        expect(getComputedStyle(shadow.querySelector('div')!).opacity).toBe('1')
        expect(readIrSla(expectedCase)).toEqual({ status: 'Succeeded', capturedAt })
    })

    it.each(['main', 'panels', 'tabs', 'headers', 'header-nodes', 'tab-children', 'ancestry'])('fails closed at the fallback bound: %s', mode => {
        recordPane()
        const outer = document.querySelector('#record')!
        if (mode === 'main') document.body.insertAdjacentHTML('beforeend', '<main></main>'.repeat(20))
        if (mode === 'panels') outer.insertAdjacentHTML('beforeend', '<div role="tabpanel" style="display:none"></div>'.repeat(20))
        if (mode === 'tabs') outer.insertAdjacentHTML('beforeend', '<li role="tab" aria-selected="true" style="display:none">Other</li>'.repeat(20))
        if (mode === 'headers') outer.insertAdjacentHTML('beforeend', '<uci-header-control-list></uci-header-control-list>'.repeat(20))
        if (mode === 'header-nodes') document.querySelector('uci-header-control-list')!.insertAdjacentHTML('beforeend', '<i></i>'.repeat(2000))
        if (mode === 'tab-children') document.querySelector('[role="tab"]')!.insertAdjacentHTML('beforeend', '<i></i>'.repeat(100))
        if (mode === 'ancestry') {
            const header = document.querySelector('uci-header-control-list')!
            let parent = outer
            for (let depth = 0; depth < 64; depth++) {
                const wrapper = document.createElement('div')
                parent.append(wrapper)
                parent = wrapper
            }
            parent.append(header)
        }
        expect(readIrSla(expectedCase)).toEqual({ status: 'unknown', capturedAt })
    })
})
