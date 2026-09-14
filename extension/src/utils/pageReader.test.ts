import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { ID_REGEX, PageReader } from './pageReader'
import { parseScrapedDataSnapshot } from './pageIdentity'

// ID_REGEX matches case/task IDs scraped from D365 pages:
//   - 16-digit case number
//   - 19-digit task ID (16-digit prefix is the parent case)
//   - Alpha-prefixed: WO-12345, INC-1234, CAS-01234-A1B2, etc.
//
// These tests pin the exact accept/reject behavior so accidental regex
// edits (changing quantifiers, dropping \b boundaries) fail loudly.

describe('ID_REGEX', () => {
  describe('numeric IDs', () => {
    it('matches a 16-digit case number', () => {
      const text = 'Case 2601190030003106 needs attention'
      const match = text.match(ID_REGEX)
      expect(match).not.toBeNull()
      expect(match![0]).toBe('2601190030003106')
    })

    it('matches a 19-digit task ID', () => {
      const text = 'Task 2601190030003106001 is blocked'
      const match = text.match(ID_REGEX)
      expect(match).not.toBeNull()
      expect(match![0]).toBe('2601190030003106001')
    })

    it('rejects 15-digit numbers (one short of case ID)', () => {
      // Note: a 15-digit number won't satisfy \d{16}, but could still match
      // the alpha-prefixed branch only if it has letters. Bare digits should
      // not match.
      const text = 'Number 260119003000310 is too short'
      const match = text.match(ID_REGEX)
      expect(match).toBeNull()
    })

    it('rejects 20-digit numbers (one over task ID)', () => {
      // \b boundaries prevent matching the first 16 or 19 digits of a longer
      // digit run — this is the whole point of \b in ID_REGEX.
      const text = 'Bad blob 26011900300031060011 not a real ID'
      const match = text.match(ID_REGEX)
      // The 20-digit run as a whole won't match (no \b in middle).
      // We assert no numeric ID is extracted; the alpha branch also won't
      // fire since there are no letters.
      expect(match).toBeNull()
    })

    it('rejects 17-digit numbers (between case and task lengths)', () => {
      // 17 digits: 16 + 1 extra, but \d{16}(?:\d{3})? means 16 OR 19,
      // not 17/18. And \b on both sides means the full 17-digit run
      // can't satisfy the 16-digit alternative either.
      const text = 'Weird 26011900300031060 here'
      const match = text.match(ID_REGEX)
      expect(match).toBeNull()
    })
  })

  describe('alpha-prefixed IDs', () => {
    it('matches WO-12345', () => {
      const text = 'See WO-12345 for details'
      const match = text.match(ID_REGEX)
      expect(match).not.toBeNull()
      expect(match![0]).toBe('WO-12345')
    })

    it('matches INC-1234', () => {
      const text = 'Incident INC-1234 opened'
      const match = text.match(ID_REGEX)
      expect(match).not.toBeNull()
      expect(match![0]).toBe('INC-1234')
    })

    it('matches CAS-01234-A1B2 (extended suffix)', () => {
      const text = 'Linked case CAS-01234-A1B2 awaiting triage'
      const match = text.match(ID_REGEX)
      expect(match).not.toBeNull()
      expect(match![0]).toBe('CAS-01234-A1B2')
    })

    it('rejects 1-letter prefix (below 2-letter minimum)', () => {
      const text = 'Just X-12345 here, not a real ID'
      const match = text.match(ID_REGEX)
      expect(match).toBeNull()
    })

    it('rejects 11-letter prefix (above 10-letter maximum)', () => {
      const text = 'ABCDEFGHIJK-12345 too long a prefix'
      const match = text.match(ID_REGEX)
      // The 11-letter prefix exceeds {2,10}; regex should not match this
      // as the alpha-prefix branch. There are no 16/19-digit runs either.
      expect(match).toBeNull()
    })

    it('rejects lowercase prefix (alpha branch requires uppercase)', () => {
      const text = 'wo-12345 should not match'
      const match = text.match(ID_REGEX)
      expect(match).toBeNull()
    })
  })
})

describe('D365 structured headers', () => {
  const caseId = '1234567890123456'
  const legacyId = '9876543210987654'

  afterEach(() => document.body.replaceChildren())

  function header(mode: ShadowRootMode = 'open') {
    const list = document.createElement('uci-header-control-list')
    document.body.append(list)
    return list.attachShadow({ mode })
  }

  function item(root: ShadowRoot | HTMLElement, name: string, label: string, value: string) {
    const el = document.createElement('uci-header-control-list-item')
    el.dataset.name = name
    el.id = '1'
    el.setAttribute('data-preview_orientation', 'column')
    el.setAttribute('data-0', 'value-text')
    el.dataset.label = 'label'
    el.dataset.divider = 'divider'
    const shadow = el.attachShadow({ mode: 'open' })
    shadow.append(document.createElement('style'))
    const owner = document.createElement('slot')
    owner.name = 'owner-persona'
    shadow.append(owner)
    const control = document.createElement('div')
    control.className = 'control-container'
    control.setAttribute('role', 'presentation')
    for (const name of ['inline-label', 'control', 'label', 'divider']) {
      const slot = document.createElement('slot')
      slot.name = name
      control.append(slot)
    }
    shadow.append(control)
    for (const [slot, text, className] of [
      ['value', value, 'value-text'], ['label', label, 'label'], ['divider', '', 'divider'],
    ]) {
      const child = document.createElement('div')
      child.slot = slot
      child.className = className
      child.textContent = text
      if (slot === 'value') child.dataset.id = '0'
      el.append(child)
    }
    root.append(el)
    return el
  }

  function legacy() {
    const main = document.createElement('main')
    main.setAttribute('role', 'main')
    const list = document.createElement('div')
    list.id = 'headerControlsList_legacy'
    for (const [value, label] of [[legacyId, 'Case number'], ['A', 'Severity'], ['Active', 'Status reason']]) {
      const cell = document.createElement('div')
      for (const text of [value, label]) {
        const part = document.createElement('div')
        part.textContent = text
        cell.append(part)
      }
      list.append(cell)
    }
    main.append(list)
    document.body.append(main)
  }

  it.each([caseId, `${caseId}001`])('recovers all three fields with composite ID %s outside main', async id => {
    const main = document.createElement('main')
    main.setAttribute('role', 'main')
    document.body.append(main)
    const root = header()
    item(root, 'synthetic_unknown_case_field', '  CASE number /\n Service NAME  ', `${id} | SC | Synthetic service`)
    item(root, 'header_severitycode', 'Severity', ' B ')
    item(root, 'header_statuscode', 'Status reason', ' Mitigated ')
    expect(await PageReader.scanForErrors()).toMatchObject({ caseNumber: id, severity: 'B', statusReason: 'Mitigated' })
  })

  it('supports the exact conventional case alias', async () => {
    item(header(), 'header_ticketnumber', 'Synthetic localized label', `${caseId} | SC | Synthetic service`)
    expect(await PageReader.scanForErrors()).toMatchObject({ caseNumber: caseId })
  })

  it('prefers the observed case label over the conventional alias', async () => {
    const root = header()
    item(root, 'header_ticketnumber', 'Synthetic alias', legacyId)
    item(root, 'synthetic_unknown_case_field', 'Case number / Service name', caseId)
    expect(await PageReader.scanForErrors()).toMatchObject({ caseNumber: caseId })
  })

  it('crosses nested open wrappers inside a known header list', async () => {
    const wrapper = document.createElement('synthetic-wrapper')
    header().append(wrapper)
    item(wrapper.attachShadow({ mode: 'open' }), 'header_severitycode', 'Severity', 'C')
    expect(await PageReader.scanForErrors()).toMatchObject({ severity: 'C' })
  })

  it('ignores unrelated IDs outside headers and wrong fields inside headers', async () => {
    const unrelated = document.createElement('div')
    unrelated.textContent = `Synthetic phone ${legacyId}`
    document.body.append(unrelated)
    const outside = document.createElement('synthetic-unrelated')
    document.body.append(outside)
    item(outside.attachShadow({ mode: 'open' }), 'header_ticketnumber', 'Case number / Service name', legacyId)
    const root = header()
    item(root, 'synthetic_other_field', 'Synthetic reference', caseId)
    item(root, 'synthetic_priority', 'Priority', 'B')
    item(root, 'synthetic_state', 'State', 'Mitigated')
    expect(await PageReader.scanForErrors()).toBeNull()
  })

  it('leaves invalid or blank expected values empty without reading sibling fields', async () => {
    const root = header()
    item(root, 'synthetic_unknown_case_field', 'Case number / Service name', '12345678901234567 | SC')
    item(root, 'header_severitycode', 'Severity', 'Critical')
    item(root, 'header_statuscode', 'Status reason', ' \n ')
    item(root, 'synthetic_other_field', 'Synthetic reference', `${caseId} B Mitigated`)
    expect(await PageReader.scanForErrors()).toBeNull()
  })

  it('preserves the legacy layout fallback', async () => {
    legacy()
    expect(await PageReader.scanForErrors()).toMatchObject({ caseNumber: legacyId, severity: 'A', statusReason: 'Active' })
  })

  it('uses legacy values when structured values are invalid', async () => {
    legacy()
    const root = header()
    item(root, 'header_ticketnumber', 'Case number / Service name', 'invalid')
    item(root, 'header_severitycode', 'Severity', 'invalid')
    item(root, 'header_statuscode', 'Status reason', ' ')
    expect(await PageReader.scanForErrors()).toMatchObject({ caseNumber: legacyId, severity: 'A', statusReason: 'Active' })
  })

  it('prefers valid structured fields over conflicting legacy values', async () => {
    legacy()
    const root = header()
    item(root, 'synthetic_unknown_case_field', 'Case number / Service name', caseId)
    item(root, 'header_severitycode', 'Severity', 'B')
    item(root, 'header_statuscode', 'Status reason', 'Mitigated')
    expect(await PageReader.scanForErrors()).toMatchObject({ caseNumber: caseId, severity: 'B', statusReason: 'Mitigated' })
  })

  it('does not pierce closed header roots', async () => {
    item(header('closed'), 'header_ticketnumber', 'Case number / Service name', caseId)
    expect(await PageReader.scanForErrors()).toBeNull()
  })

  it('reads visible A headers rather than retained hidden B fields', async () => {
    const hidden = header()
    hidden.host.setAttribute('style', 'display:none')
    item(hidden, 'header_ticketnumber', 'Case number / Service name', legacyId)
    item(hidden, 'header_severitycode', 'Severity', 'A')
    item(hidden, 'header_statuscode', 'Status reason', 'Wrong B status')
    const active = header()
    item(active, 'header_ticketnumber', 'Case number / Service name', caseId)
    item(active, 'header_severitycode', 'Severity', 'B')
    item(active, 'header_statuscode', 'Status reason', 'Active A')
    expect(PageReader.readLiveRecordNumber(false)).toBe(caseId)
    expect(await PageReader.scanForErrors()).toMatchObject({ caseNumber: caseId, severity: 'B', statusReason: 'Active A' })
  })

  it('ignores an assigned-slot-hidden header and rejects two visible panes even with the same number', () => {
    const retained = header()
    item(retained, 'header_ticketnumber', 'Case number / Service name', legacyId)
    const host = document.createElement('synthetic-slotted-host')
    document.body.append(host)
    host.attachShadow({ mode: 'open' }).innerHTML = '<slot style="display:none"></slot>'
    host.append(retained.host)
    item(header(), 'header_ticketnumber', 'Case number / Service name', caseId)
    expect(PageReader.readLiveRecordNumber(false)).toBe(caseId)
    item(header(), 'header_ticketnumber', 'Case number / Service name', caseId)
    expect(PageReader.readLiveRecordNumber(false)).toBeNull()
  })

  it('keeps legacy XPath snapshot membership stable when the DOM mutates during await', async () => {
    vi.useFakeTimers()
    try {
      document.body.innerHTML = `<main role="main">${'<section><span>Not an ID</span><label>Case number</label></section>'.repeat(6)}<section><span>${caseId}</span><label>Case number</label></section></main>`
      const evaluate = document.evaluate.bind(document)
      const schedule = setTimeout
      let mutated = false
      const spy = vi.spyOn(document, 'evaluate').mockImplementation((...args) => {
        const result = evaluate(...args)
        if (args[0].includes('Work Order Number')) {
          expect(args[3]).toBe(XPathResult.ORDERED_NODE_SNAPSHOT_TYPE)
          schedule(() => {
            mutated = true
            document.querySelector('main')!.insertAdjacentHTML('afterbegin', `<section><span>${legacyId}</span><label>Case number</label></section>`)
          }, 0)
        }
        return result
      })
      const pending = PageReader.scanForErrors()
      await vi.runAllTimersAsync()
      expect(mutated).toBe(true)
      expect(await pending).toMatchObject({ caseNumber: caseId })
      spy.mockRestore()
    } finally {
      vi.restoreAllMocks()
      vi.useRealTimers()
    }
  })
})

describe('current-record Created On bridge in a page scan', () => {
  const caseNumber = '2601190030003106001'
  const createdOnUtc = '2031-04-17T10:23:00.123Z'
  const sendMessage = vi.fn()
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    vi.stubGlobal('location', { origin: 'https://onesupport.crm.dynamics.com' })
    vi.stubGlobal('chrome', { runtime: { sendMessage } })
    sendMessage.mockReset().mockResolvedValue({ status: 'ok', caseNumber, createdOnUtc })
    document.body.innerHTML = `<main role="main"><h1>Synthetic case</h1><div id="live-record" role="tabpanel"><uci-header-control-list><uci-header-control-list-item data-name="header_msdfm_casenumberservicelevel"><span slot="value">${caseNumber} | Synthetic service</span></uci-header-control-list-item></uci-header-control-list></div></main>`
  })
  afterEach(() => {
    document.body.replaceChildren()
    vi.restoreAllMocks()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('reads once without Details and preserves UTC in the existing snapshot field', async () => {
    const data = await PageReader.scanForErrors(7)
    expect(data).toMatchObject({ caseNumber, createdOn: `${createdOnUtc} (UTC)` })
    expect(parseScrapedDataSnapshot(data)).toMatchObject({ caseNumber, createdOn: `${createdOnUtc} (UTC)` })
    expect(sendMessage).toHaveBeenCalledExactlyOnceWith({ type: 'DH_READ_CREATED_ON', caseNumber })
    expect(console.debug).toHaveBeenLastCalledWith('[DH] Created On', 'scan', 'success', 7, null)
    expect(JSON.stringify(vi.mocked(console.debug).mock.calls)).not.toContain(caseNumber)
    expect(JSON.stringify(vi.mocked(console.debug).mock.calls)).not.toContain(createdOnUtc)
  })

  it.each(['unavailable', 'parent', 'accessor', 'unsupported', 'success'])('preserves raw DOM fallback unless a valid model UTC is available: %s', async mode => {
    document.querySelector('main')!.insertAdjacentHTML('beforeend', '<input data-id="createdon.fieldControl-date-time-input" value="04/17/2031 6:23 PM">')
    const get = vi.fn(() => createdOnUtc)
    if (mode === 'unavailable') sendMessage.mockResolvedValue({ status: 'unavailable' })
    if (mode === 'parent') sendMessage.mockResolvedValue({ status: 'ok', caseNumber: caseNumber.slice(0, 16), createdOnUtc })
    if (mode === 'accessor') sendMessage.mockResolvedValue(Object.defineProperty({ status: 'ok', caseNumber }, 'createdOnUtc', { get }))
    if (mode === 'unsupported') vi.stubGlobal('chrome', undefined)
    expect((await PageReader.scanForErrors())?.createdOn).toBe(mode === 'success' ? `${createdOnUtc} (UTC)` : '04/17/2031 6:23 PM')
    expect(get).not.toHaveBeenCalled()
  })

  it.each(['success', 'unavailable', 'timeout'])('discards the entire scan when identity changes during bridge %s', async outcome => {
    vi.useFakeTimers()
    sendMessage.mockImplementation(async () => {
      document.querySelector('[slot="value"]')!.textContent = '2601190030003107 | Other service'
      if (outcome === 'timeout') return new Promise(() => {})
      return outcome === 'success' ? { status: 'ok', caseNumber, createdOnUtc } : { status: 'unavailable' }
    })
    const pending = PageReader.scanForErrors()
    await vi.runAllTimersAsync()
    expect(await pending).toBeNull()
    expect(console.debug).toHaveBeenLastCalledWith('[DH] Created On', 'scan', 'identity_changed', null, null)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('discards stale extracted identity before requesting a model date', async () => {
    vi.useFakeTimers()
    document.querySelector('uci-header-control-list')!.insertAdjacentHTML('beforeend', '<span></span>'.repeat(60))
    const schedule = setTimeout
    let changed = false
    const original = document.createTreeWalker.bind(document)
    vi.spyOn(document, 'createTreeWalker').mockImplementation((...args) => {
      const walker = original(...args)
      if (args[0] instanceof Element && args[0].localName === 'uci-header-control-list' && !changed) {
        changed = true
        schedule(() => { document.querySelector('[slot="value"]')!.textContent = '2601190030003107 | Other service' }, 0)
      }
      return walker
    })
    const pending = PageReader.scanForErrors()
    await vi.runAllTimersAsync()
    expect(await pending).toBeNull()
    expect(sendMessage).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
    expect(console.debug).toHaveBeenLastCalledWith('[DH] Created On', 'scan', 'identity_rejected', null, null)
  })

  it('reads live slots rather than identity captured before a post-bridge traversal yield', async () => {
    vi.useFakeTimers()
    sendMessage.mockImplementation(async () => {
      document.querySelector('uci-header-control-list')!.insertAdjacentHTML('beforeend', '<span></span>'.repeat(60))
      const original = document.createTreeWalker.bind(document)
      vi.spyOn(document, 'createTreeWalker').mockImplementation((...args) => {
        const walker = original(...args)
        if (args[0] instanceof Element && args[0].localName === 'uci-header-control-list') {
          const next = walker.nextNode.bind(walker)
          let visited = 0
          vi.spyOn(walker, 'nextNode').mockImplementation(() => {
            const node = next()
            if (++visited === 50) document.querySelector('[slot="value"]')!.textContent = '2601190030003107 | Other service'
            return node
          })
        }
        return walker
      })
      return { status: 'ok', caseNumber, createdOnUtc }
    })
    const pending = PageReader.scanForErrors()
    await vi.runAllTimersAsync()
    expect(await pending).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['same', 'changed'])('revalidates a legacy header with %s identity on unavailable response', async mode => {
    document.querySelector('uci-header-control-list')!.remove()
    document.querySelector('main')!.insertAdjacentHTML('beforeend', `<div id="headerControlsList_1">${caseNumber}</div><input data-id="createdon.fieldControl-date-time-input" value="Raw date">`)
    sendMessage.mockImplementation(async () => {
      if (mode === 'changed') document.querySelector('#headerControlsList_1')!.textContent = '2601190030003107'
      return { status: 'unavailable' }
    })
    const data = await PageReader.scanForErrors()
    if (mode === 'changed') expect(data).toBeNull()
    else expect(data).toMatchObject({ caseNumber, createdOn: 'Raw date' })
  })

  it('preserves a same-identity raw DOM date after bridge timeout', async () => {
    vi.useFakeTimers()
    document.querySelector('main')!.insertAdjacentHTML('beforeend', '<input data-id="createdon.fieldControl-date-time-input" value="Raw date">')
    sendMessage.mockReturnValue(new Promise(() => {}))
    const pending = PageReader.scanForErrors()
    await vi.runAllTimersAsync()
    expect(await pending).toMatchObject({ caseNumber, createdOn: 'Raw date' })
    expect(console.debug).toHaveBeenLastCalledWith('[DH] Created On', 'scan', 'dom_fallback', null, null)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not request a model date for nonnumeric identities', async () => {
    document.querySelector('[slot="value"]')!.textContent = 'WO-12345'
    expect((await PageReader.scanForErrors())?.caseNumber).toBe('WO-12345')
    expect(sendMessage).not.toHaveBeenCalled()
    expect(console.debug).toHaveBeenLastCalledWith('[DH] Created On', 'scan', 'not_requested', null, null)
  })

  function irTimer(text = 'Succeeded') {
    document.querySelector('#live-record')!.insertAdjacentHTML('beforeend', `<div role="tablist"><button role="tab" aria-selected="true" aria-controls="summary-panel" style="visibility:visible">Summary</button></div><div id="summary-panel" role="tabpanel" aria-label="Summary" style="visibility:visible"><div data-id="IR_SLA_Timer" data-control-name="IR_SLA_Timer"><span data-id="IR_SLA_Timer.fieldControl-SucceededLabelId" style="visibility:visible" aria-hidden="true">${text}</span></div></div>`)
    return vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue([{ width: 80, height: 20 }] as unknown as DOMRectList)
  }

  it.each([caseNumber, caseNumber.slice(0, 16)])('captures IR after the final bridge await for the exact record %s', async exactCase => {
    const geometry = irTimer('00:10:00')
    const capturedAt = '2031-04-18T01:02:03.456Z'
    document.querySelector('[slot="value"]')!.textContent = exactCase
    vi.useFakeTimers()
    vi.setSystemTime(new Date(createdOnUtc))
    sendMessage.mockImplementation(async () => {
      expect(geometry).not.toHaveBeenCalled()
      document.querySelector('[data-id="IR_SLA_Timer.fieldControl-SucceededLabelId"]')!.textContent = 'Succeeded'
      vi.setSystemTime(new Date(capturedAt))
      return { status: 'ok', caseNumber: exactCase, createdOnUtc }
    })
    const pending = PageReader.scanForErrors()
    await vi.runAllTimersAsync()
    const data = await pending
    expect(data).toMatchObject({ caseNumber: exactCase, irSlaStatus: 'Succeeded', irSlaCapturedAt: capturedAt })
    expect(parseScrapedDataSnapshot(data)).toMatchObject({ irSlaStatus: 'Succeeded', irSlaCapturedAt: capturedAt })
    document.querySelector('[data-id="IR_SLA_Timer.fieldControl-SucceededLabelId"]')!.textContent = 'Expired'
    expect(data?.irSlaStatus).toBe('Succeeded')
    expect(sendMessage).toHaveBeenCalledExactlyOnceWith({ type: 'DH_READ_CREATED_ON', caseNumber: exactCase })
  })

  it('records unknown only for an observed unsupported root, not for an absent root', async () => {
    const absent = await PageReader.scanForErrors()
    expect(absent).not.toHaveProperty('irSlaStatus')
    expect(absent).not.toHaveProperty('irSlaCapturedAt')
    irTimer('00:10:00')
    const unknown = await PageReader.scanForErrors()
    expect(unknown?.irSlaStatus).toBe('unknown')
    expect(new Date(unknown!.irSlaCapturedAt!).toISOString()).toBe(unknown?.irSlaCapturedAt)
  })

  it('does not authorize an IR panel from a canonical header outside the record pane', async () => {
    irTimer()
    document.body.append(document.querySelector('uci-header-control-list')!)
    const data = await PageReader.scanForErrors()
    expect(data).toMatchObject({ caseNumber, irSlaStatus: 'unknown' })
  })

  it.each([caseNumber, caseNumber.slice(0, 16)])('passes confirmed case %s to the real Summary fallback and captures the post-await timestamp', async exactCase => {
    irTimer('00:10:00')
    const outer = document.querySelector('#live-record')!
    const header = document.querySelector('uci-header-control-list')!
    header.querySelector('[slot="value"]')!.textContent = `${exactCase} | Synthetic service`
    const oldTab = document.querySelector('[role="tab"]')!
    oldTab.parentElement!.remove()
    const summary = document.querySelector('#summary-panel')!
    const timer = document.querySelector('[data-id="IR_SLA_Timer"]')!
    summary.insertAdjacentHTML('beforebegin', '<ul role="tablist"><li role="tab" aria-selected="true" aria-label="Summary">Summary<div>Aggregate decorative junk</div></li></ul>')
    expect(document.querySelectorAll('main > [role="tabpanel"]')).toHaveLength(1)
    expect(header.parentElement).toBe(outer)
    expect(summary.parentElement).toBe(outer)
    summary.insertAdjacentHTML('beforeend', '<section data-id="Performance_indicators_section" aria-label="Performance indicators"></section>')
    summary.querySelector('section')!.append(timer)
    const capturedAt = '2031-04-18T01:02:03.456Z'
    vi.useFakeTimers()
    vi.setSystemTime(new Date(createdOnUtc))
    sendMessage.mockImplementation(async () => {
      timer.firstElementChild!.textContent = 'Succeeded'
      vi.setSystemTime(new Date(capturedAt))
      return { status: 'ok', caseNumber: exactCase, createdOnUtc }
    })
    const pending = PageReader.scanForErrors()
    await vi.runAllTimersAsync()
    const data = await pending
    expect(data).toMatchObject({ caseNumber: exactCase, createdOn: `${createdOnUtc} (UTC)`, irSlaStatus: 'Succeeded', irSlaCapturedAt: capturedAt })
    expect(parseScrapedDataSnapshot(data)).toMatchObject({ irSlaStatus: 'Succeeded', irSlaCapturedAt: capturedAt })
    expect(sendMessage).toHaveBeenCalledExactlyOnceWith({ type: 'DH_READ_CREATED_ON', caseNumber: exactCase })
  })

  it.each(['title', 'legacy', 'nonnumeric'])('does not authorize IR from %s identity', async mode => {
    const geometry = irTimer()
    if (mode === 'nonnumeric') document.querySelector('[slot="value"]')!.textContent = 'WO-12345'
    else {
      document.querySelector('uci-header-control-list')!.remove()
      if (mode === 'title') document.querySelector('h1')!.textContent = caseNumber
      else document.querySelector('main')!.insertAdjacentHTML('beforeend', `<div id="headerControlsList_1">${caseNumber}</div>`)
    }
    const data = await PageReader.scanForErrors()
    expect(data).not.toBeNull()
    expect(data).not.toHaveProperty('irSlaStatus')
    expect(data).not.toHaveProperty('irSlaCapturedAt')
    expect(geometry).not.toHaveBeenCalled()
  })

  it.each(['parent', 'sibling-task', 'missing', 'conflict'])('discards IR and the scan on post-await identity change: %s', async mode => {
    const geometry = irTimer()
    sendMessage.mockImplementation(async () => {
      if (mode === 'missing') document.querySelector('uci-header-control-list')!.remove()
      else if (mode === 'conflict') document.querySelector('uci-header-control-list')!.insertAdjacentHTML('beforeend', '<uci-header-control-list-item data-name="header_msdfm_casenumberservicelevel"><span slot="value">2601190030003106002</span></uci-header-control-list-item>')
      else document.querySelector('[slot="value"]')!.textContent = mode === 'parent' ? caseNumber.slice(0, 16) : '2601190030003106002'
      return { status: 'unavailable' }
    })
    expect(await PageReader.scanForErrors()).toBeNull()
    expect(geometry).not.toHaveBeenCalled()
  })

  it('revalidates exact identity after the synchronous IR read', async () => {
    const geometry = irTimer()
    const labelGeometry = vi.spyOn(document.querySelector('[data-id="IR_SLA_Timer.fieldControl-SucceededLabelId"]')!, 'getClientRects')
    labelGeometry.mockImplementation(() => {
      document.querySelector('[slot="value"]')!.textContent = '2601190030003106002'
      return [{ width: 80, height: 20 }] as unknown as DOMRectList
    })
    expect(await PageReader.scanForErrors()).toBeNull()
    expect(geometry).toHaveBeenCalled()
    expect(labelGeometry).toHaveBeenCalledOnce()
  })

  it.each(['foreign-pane', 'inactive-summary', 'unlinked-summary'])('keeps IR unknown despite stable case identity when ownership is %s', async mode => {
    irTimer()
    if (mode === 'foreign-pane') document.body.append(document.querySelector('[data-id="IR_SLA_Timer"]')!)
    if (mode === 'inactive-summary') document.querySelector('[role="tab"]')!.setAttribute('aria-selected', 'false')
    if (mode === 'unlinked-summary') {
      document.querySelector('[role="tab"]')!.removeAttribute('aria-controls')
      document.querySelector('#summary-panel')!.setAttribute('aria-label', 'Unlinked panel')
    }
    const data = await PageReader.scanForErrors()
    expect(data).toMatchObject({ caseNumber, irSlaStatus: 'unknown' })
    expect(new Date(data!.irSlaCapturedAt!).toISOString()).toBe(data?.irSlaCapturedAt)
  })
})

describe('Created On DOM fallback budgets', () => {
  // Exercise the DOM fallback itself, without a model bridge or unrelated scan work.
  const readCreatedOn = (context: Element) => (PageReader as unknown as {
    readCreatedOn(context: Element): Promise<string | undefined>
  }).readCreatedOn(context)

  function context(fields: string) {
    document.body.innerHTML = `<main role="main">${fields}</main>`
    return document.querySelector('main')!
  }

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    document.body.replaceChildren()
  })

  it.each(['nodes', 'text', 'attribute'])('rejects oversized discovery %s before reading a fallback value', async bound => {
    vi.useFakeTimers()
    const main = context('<input data-id="createdon.fieldControl-date-time-input" value="Fallback must not be read">')
    if (bound === 'nodes') main.insertAdjacentHTML('beforeend', '<div></div>'.repeat(2001))
    if (bound === 'text') main.append(document.createTextNode('x'.repeat(10001)))
    if (bound === 'attribute') main.firstElementChild!.setAttribute('aria-labelledby', 'x'.repeat(10001))
    const input = main.querySelector('input')!
    const value = vi.spyOn(input, 'value', 'get')
    const query = vi.spyOn(main, 'querySelectorAll')
    const aggregate = vi.spyOn(main, 'textContent', 'get')
    const pending = readCreatedOn(main)
    await vi.runAllTimersAsync()
    expect(await pending).toBeUndefined()
    expect(value).not.toHaveBeenCalled()
    expect(query).not.toHaveBeenCalled()
    expect(aggregate).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('charges repeated nested aria group inspection to the same invocation budget', async () => {
    vi.useFakeTimers()
    const ids = Array.from({ length: 20 }, (_, index) => `created-${index}`)
    const main = context(`<section>${ids.map(id => `<span id="${id}">Created On</span>`).join('')}<div aria-labelledby="${ids.join(' ')}">${'<div><span></span></div>'.repeat(150)}<input value=""></div></section><input data-id="createdon.fieldControl-date-time-input" value="Must not fall through">`)
    const fallback = vi.spyOn(main.querySelector('[data-id]') as HTMLInputElement, 'value', 'get')
    const pending = readCreatedOn(main)
    await vi.runAllTimersAsync()
    expect(await pending).toBeUndefined()
    expect(fallback).not.toHaveBeenCalled()
  })

  it('ignores inert template fields instead of treating them as live duplicate datetime containers', async () => {
    const main = context('<template><div data-id="createdon.fieldControl-datetime-description_container"><input value="Template date"></div></template><div data-id="createdon.fieldControl-datetime-description_container"><input readonly value="04/17/2031"><input readonly value="6:23 PM"></div>')
    expect(await readCreatedOn(main)).toBe('04/17/2031 6:23 PM')
  })

  it('keeps a hidden association label for visible readonly date and time inputs', async () => {
    const main = context('<section><span hidden id="created-label">Created On</span><div aria-labelledby="created-label"><input readonly value="04/17/2031"><input readonly value="6:23 PM"></div></section>')
    expect(await readCreatedOn(main)).toBe('04/17/2031 6:23 PM')
  })

  it.each(['datetime', 'label', 'explicit'])('rejects an overlong raw %s value without truncation or another fallback', async mode => {
    const oversized = 'x'.repeat(257)
    const field = mode === 'datetime'
      ? `<div data-id="createdon.fieldControl-datetime-description_container"><input value="${oversized}"></div>`
      : mode === 'label'
        ? `<section><label for="created">Created On</label><input id="created" value="${oversized}"></section>`
        : `<input data-id="createdon.fieldControl-date-time-input" value="${oversized}">`
    const main = context(`${field}<input data-id="createdon.fieldControl-time-input" value="Must not fall through">`)
    const fallback = vi.spyOn(main.lastElementChild as HTMLInputElement, 'value', 'get')
    expect(await readCreatedOn(main)).toBeUndefined()
    expect(fallback).not.toHaveBeenCalled()
  })

  it('reads each candidate value once after the last discovery yield', async () => {
    vi.useFakeTimers()
    const main = context('<span></span>'.repeat(60) + '<label for="created">Created On</label><div data-id="createdon.fieldControl-datetime-description_container"><input id="created" data-id="createdon.fieldControl-date-time-input" value=""></div>')
    const input = main.querySelector('input')!
    const value = vi.spyOn(input, 'value', 'get')
    const pending = readCreatedOn(main)
    expect(value).not.toHaveBeenCalled()
    await vi.runAllTimersAsync()
    expect(await pending).toBeUndefined()
    expect(value).toHaveBeenCalledTimes(1)
  })

  it('uses current readonly values changed during discovery, without date parsing', async () => {
    vi.useFakeTimers()
    const main = context('<span></span>'.repeat(60) + '<div data-id="createdon.fieldControl-datetime-description_container"><input readonly value="Old date"><input readonly value="Old time"></div>')
    const inputs = main.querySelectorAll('input')
    const pending = readCreatedOn(main)
    inputs[0].value = '17.04.2031'
    inputs[1].value = '21:07'
    await vi.runAllTimersAsync()
    expect(await pending).toBe('17.04.2031 21:07')
  })

  it('rejects excessive field ancestry before reading a value or falling through', async () => {
    vi.useFakeTimers()
    const main = context(`<div data-id="createdon.fieldControl-datetime-description_container">${'<div>'.repeat(65)}<input readonly value="Too deep">${'</div>'.repeat(65)}</div><input data-id="createdon.fieldControl-date-time-input" value="Must not fall through">`)
    const value = vi.spyOn(HTMLInputElement.prototype, 'value', 'get')
    const pending = readCreatedOn(main)
    await vi.runAllTimersAsync()
    expect(await pending).toBeUndefined()
    expect(value).not.toHaveBeenCalled()
  })

  it('enforces the deadline in the final synchronous value-validation phase', async () => {
    vi.useFakeTimers()
    const main = context('<input data-id="createdon.fieldControl-date-time-input" value="04/17/2031">')
    const readStyle = getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation(element => {
      vi.setSystemTime(Date.now() + 1001)
      return readStyle(element)
    })
    const value = vi.spyOn(main.querySelector('input')!, 'value', 'get')
    expect(await readCreatedOn(main)).toBeUndefined()
    expect(value).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['detached', 'new-child', 'foreign-field', 'duplicate-field', 'deadline'])('fails closed on discovery yield change: %s', async change => {
    vi.useFakeTimers()
    const main = context('<div id="first"></div>' + '<span></span>'.repeat(60) + '<div data-id="createdon.fieldControl-datetime-description_container"><input readonly value="04/17/2031"></div>')
    const input = main.querySelector('input')!
    const value = vi.spyOn(input, 'value', 'get')
    const pending = readCreatedOn(main)
    if (change === 'detached') main.remove()
    if (change === 'new-child') main.firstElementChild!.append(document.createElement('input'))
    if (change === 'foreign-field') input.setAttribute('data-id', 'modifiedon.fieldControl-date-time-input')
    if (change === 'duplicate-field') main.firstElementChild!.setAttribute('data-id', 'createdon.fieldControl-datetime-description_container')
    if (change === 'deadline') vi.setSystemTime(Date.now() + 1001)
    await vi.runAllTimersAsync()
    expect(await pending).toBeUndefined()
    expect(value).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('D365 case metadata', () => {
  const currentNumber = '2601190030003106001'
  afterEach(() => {
    document.body.replaceChildren()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  function recordHeader(number = currentNumber) {
    return `<uci-header-control-list><uci-header-control-list-item data-name="header_msdfm_casenumberservicelevel"><span slot="value">${number} | Synthetic service</span></uci-header-control-list-item></uci-header-control-list>`
  }

  function page(fields: string, outside = '') {
    document.body.innerHTML = `<main role="main"><h1>Synthetic case</h1>${recordHeader()}${fields}</main>${outside}`
  }

  function customer(items: string) {
    return `<ul data-id="customerid.fieldControl-LookupResultsDropdown_customerid_SelectedRecordList">${items}</ul>`
  }

  it('reads a late customer using the exact live task header without a full scan or geometry', () => {
    const number = '2601190030003106001'
    page('')
    expect(PageReader.readCustomerName(number)).toBeUndefined()
    document.querySelector('main')!.insertAdjacentHTML('beforeend', customer('<li><a>Late Account</a><button>Remove</button></li>'))
    expect(PageReader.readCustomerName(number)).toBe('Late Account')
    expect(PageReader.readCustomerName('2601190030003106')).toBeUndefined()
    expect(PageReader.readCustomerName('2601190030003106002')).toBeUndefined()
    document.querySelector('[slot="value"]')!.textContent = '2601190030003106002'
    expect(PageReader.readCustomerName(number)).toBeUndefined()
  })

  it('does not authorize enrichment from title text, missing headers, or conflicting live records', () => {
    const number = '2601190030003106'
    page(customer('<li><a>Wrong Account</a></li>'))
    document.querySelector('uci-header-control-list')!.remove()
    document.querySelector('h1')!.textContent = number
    expect(PageReader.readLiveRecordNumber()).toBe(number)
    expect(PageReader.readCustomerName(number)).toBeUndefined()
    document.body.insertAdjacentHTML('beforeend', `<uci-header-control-list><uci-header-control-list-item data-name="header_ticketnumber"><span slot="value">${number} 2601190030003107</span></uci-header-control-list-item></uci-header-control-list>`)
    expect(PageReader.readCustomerName(number)).toBeUndefined()
  })

  it('does not use an outside customer when the current main lookup is empty or ambiguous', () => {
    page(customer(''), customer('<li><a>Outside Account</a></li>'))
    expect(PageReader.readCustomerName()).toBeUndefined()
    document.querySelector('main ul')!.innerHTML = '<li><a>First</a></li><li><a>Second</a></li>'
    expect(PageReader.readCustomerName()).toBeUndefined()
  })

  it('does not read hidden B customer as A when only the retained record has a lookup', () => {
    page('')
    const retained = `<section role="tabpanel" style="display:none">${recordHeader('2601190030003106002')}${customer('<li><a>Wrong B</a></li>')}</section>`
    document.body.insertAdjacentHTML('afterbegin', retained)
    expect(PageReader.readLiveRecordNumber(false)).toBe(currentNumber)
    expect(PageReader.readCustomerName(currentNumber)).toBeUndefined()
    document.querySelector('main')!.insertAdjacentHTML('beforeend', customer('<li><a>Current A</a></li>'))
    expect(PageReader.readCustomerName(currentNumber)).toBe('Current A')
  })

  it('requires an owned visible main or outer record tabpanel, never a document fallback', () => {
    page('', customer('<li><a>Unowned</a></li>'))
    expect(PageReader.readCustomerName(currentNumber)).toBeUndefined()
    const panel = document.createElement('section')
    panel.setAttribute('role', 'tabpanel')
    panel.append(...document.body.childNodes)
    document.body.append(panel)
    expect(PageReader.readCustomerName(currentNumber)).toBe('Unowned')
    document.querySelector('uci-header-control-list')!.remove()
    expect(PageReader.readCustomerName()).toBeUndefined()
    document.body.innerHTML = customer('<li><a>Standalone without record</a></li>')
    expect(PageReader.readCustomerName()).toBeUndefined()
  })

  it('does not use a visible foreign main lookup under the same outer tabpanel', () => {
    document.body.innerHTML = `<section role="tabpanel"><main role="main">${recordHeader()}</main><main role="main">${customer('<li><a>Foreign</a></li>')}</main></section>`
    expect(PageReader.readCustomerName(currentNumber)).toBeUndefined()
  })

  it.each(['explicit', 'observed-summary', 'main-owner'])('reads Customer from a selected same-record content panel: %s', mode => {
    const controls = mode === 'observed-summary' ? '' : 'aria-controls="customer-summary"'
    const contents = `${recordHeader()}<ul role="tablist"><li role="tab" aria-selected="true" aria-label="Summary" ${controls}>Summary<div>Aggregate decorative junk</div></li></ul><section id="customer-summary" role="tabpanel" aria-label="Summary">${customer('<li><label>Current Account</label></li>')}</section>`
    document.body.innerHTML = mode === 'main-owner'
      ? `<main role="main">${contents}</main>`
      : `<main role="main"><section role="tabpanel">${contents}</section></main>`
    expect(PageReader.readCustomerName(currentNumber)).toBe('Current Account')
  })

  it.each(['foreign-header', 'hidden-header', 'foreign-main', 'aria-hidden', 'hidden', 'css-hidden', 'inactive-tab', 'unlinked-panel'])('rejects an unowned or inactive nested Customer panel: %s', mode => {
    document.body.innerHTML = `<main role="main"><section role="tabpanel">${recordHeader()}<ul role="tablist"><li role="tab" aria-selected="true" aria-controls="customer-summary">Summary</li></ul><section id="customer-summary" role="tabpanel" aria-label="Summary">${customer('<li><a>Wrong Account</a></li>')}</section></section></main>`
    const panel = document.querySelector('#customer-summary')!
    if (mode === 'foreign-header') panel.insertAdjacentHTML('afterbegin', recordHeader('2601190030003106002'))
    if (mode === 'hidden-header') panel.insertAdjacentHTML('afterbegin', `<div hidden>${recordHeader('2601190030003106002')}</div>`)
    if (mode === 'foreign-main') panel.innerHTML = `<div role="main">${customer('<li><a>Wrong Account</a></li>')}</div>`
    if (mode === 'aria-hidden') panel.setAttribute('aria-hidden', 'true')
    if (mode === 'hidden') panel.setAttribute('hidden', '')
    if (mode === 'css-hidden') panel.setAttribute('style', 'display:none')
    if (mode === 'inactive-tab') document.querySelector('[role="tab"]')!.setAttribute('aria-selected', 'false')
    if (mode === 'unlinked-panel') document.querySelector('[role="tab"]')!.setAttribute('aria-controls', 'another-panel')
    expect(PageReader.readCustomerName(currentNumber)).toBeUndefined()
  })

  function wrappedCustomerPanel(label = 'Summary') {
    document.body.innerHTML = `<main role="main"><section role="tabpanel" id="record-pane">
      ${recordHeader()}<div><div><ul role="tablist"><li role="tab" aria-selected="true" aria-label="${label}" id="record-tab">Decorative text</li></ul></div></div>
      <div><div><section id="customer-summary" role="tabpanel" aria-label="${label}">
        <div><ul role="tablist"><li role="tab" aria-selected="true">Nested widget</li></ul></div>
        ${customer('<li><div aria-hidden="true">Icon</div><div role="link"><div role="presentation">Synthetic Account</div></div></li>')}
      </section></div></div>
    </section></main>`
  }

  it.each(['Summary', '\u6458\u8981', 'explicit'])('reads Customer through same-record wrappers without relying on English: %s', mode => {
    wrappedCustomerPanel(mode === 'explicit' ? 'Details' : mode)
    if (mode === 'explicit') {
      document.querySelector('#record-tab')!.setAttribute('aria-controls', 'customer-summary')
      document.querySelector('#customer-summary')!.removeAttribute('aria-label')
    }
    expect(PageReader.readCustomerName(currentNumber)).toBe('Synthetic Account')
    expect(PageReader.readCustomerName('2601190030003106002')).toBeUndefined()
  })

  it.each(['wrong-link', 'duplicate-panel', 'duplicate-tab', 'foreign-tab', 'foreign-panel', 'hidden-wrapper', 'different-label', 'empty-label', 'hidden-header'])('rejects ambiguous or foreign Customer wrappers: %s', mode => {
    wrappedCustomerPanel()
    const tab = document.querySelector('#record-tab')!
    const panel = document.querySelector('#customer-summary')!
    if (mode === 'wrong-link') tab.setAttribute('aria-controls', 'missing-panel')
    if (mode === 'duplicate-panel') panel.insertAdjacentHTML('afterend', '<section role="tabpanel" aria-label="Summary"></section>')
    if (mode === 'duplicate-tab') tab.insertAdjacentHTML('afterend', '<li role="tab" aria-selected="true" aria-label="Summary"></li>')
    if (mode === 'foreign-tab') tab.parentElement!.parentElement!.setAttribute('role', 'tabpanel')
    if (mode === 'foreign-panel') panel.parentElement!.setAttribute('role', 'tabpanel')
    if (mode === 'hidden-wrapper') tab.parentElement!.parentElement!.setAttribute('aria-hidden', 'true')
    if (mode === 'different-label') panel.setAttribute('aria-label', 'Other panel')
    if (mode === 'empty-label') { panel.setAttribute('aria-label', ''); tab.setAttribute('aria-label', '') }
    if (mode === 'hidden-header') panel.insertAdjacentHTML('afterbegin', `<div hidden>${recordHeader('2601190030003106002')}</div>`)
    expect(PageReader.readCustomerName(currentNumber)).toBeUndefined()
  })

  it('uses original-node CSS visibility and never infers a name from email attributes', () => {
    page(customer('<li><a href="mailto:other@example.invalid" title="Wrong title"><span style="display:none">Hidden B</span>Current A</a><span style="visibility:hidden">Hidden alias</span></li>'))
    const clone = vi.spyOn(Node.prototype, 'cloneNode')
    expect(PageReader.readCustomerName(currentNumber)).toBe('Current A')
    expect(clone).not.toHaveBeenCalled()
    page(customer('<li><a href="mailto:other@example.invalid" title="Wrong title"></a><input value="Other Account"></li>'))
    expect(PageReader.readCustomerName(currentNumber)).toBeUndefined()
  })

  it('ignores a CSS-hidden retained lookup inside the current main', () => {
    page(`<div style="display:none">${customer('<li><a>Hidden B</a></li>')}</div>${customer('<li><label>Current A</label></li>')}`)
    expect(PageReader.readCustomerName(currentNumber)).toBe('Current A')
    document.querySelector('main > ul')!.remove()
    expect(PageReader.readCustomerName(currentNumber)).toBeUndefined()
  })

  it('enforces the Customer deadline during original-node style inspection', () => {
    vi.useFakeTimers()
    page(customer('<li><a>Current A</a></li>'))
    const readStyle = getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation(element => {
      if (element.localName === 'a') vi.setSystemTime(Date.now() + 1001)
      return readStyle(element)
    })
    expect(PageReader.readCustomerName(currentNumber)).toBeUndefined()
  })

  it.each(['nodes', 'text', 'depth'])('fails closed before consuming an oversized customer %s subtree', bound => {
    page(customer('<li><a>Current A</a></li>'))
    const item = document.querySelector('li')!
    if (bound === 'nodes') item.insertAdjacentHTML('beforeend', '<span></span>'.repeat(2001))
    if (bound === 'text') item.append(document.createTextNode('x'.repeat(10001)))
    if (bound === 'depth') item.insertAdjacentHTML('beforeend', `${'<span>'.repeat(65)}deep${'</span>'.repeat(65)}`)
    const clone = vi.spyOn(Node.prototype, 'cloneNode')
    const aggregate = vi.spyOn(item, 'textContent', 'get')
    const style = vi.spyOn(window, 'getComputedStyle')
    expect(PageReader.readCustomerName(currentNumber)).toBeUndefined()
    expect(clone).not.toHaveBeenCalled()
    expect(aggregate).not.toHaveBeenCalled()
    expect(style.mock.calls.length).toBeLessThan(12000)
  })

  it.each(['a', 'label', 'span'])('reads the selected light-DOM customer %s, not icon or remove controls', async tag => {
    page(customer(`<li>
      <div data-id="customerid.fieldControl-entityIconContainer_selectedRecords_account_0"><svg><title>Account</title></svg></div>
      <${tag}>Synthetic Account Ltd</${tag}>
      <button>Remove Synthetic Account Ltd</button><span role="button" aria-label="Remove">X</span>
      <span aria-hidden="true">X</span><img alt="Account"><input value="Search text">
    </li>`))
    expect(await PageReader.scanForErrors()).toMatchObject({ customerName: 'Synthetic Account Ltd' })
  })

  it.each([
    '',
    customer('<li><button>Remove</button><span aria-label="Remove">X</span><input value="Unselected search"></li>'),
    customer('<li><a>First Account</a></li><li><a>Second Account</a></li>'),
    customer('<li><span>First Account</span><span>Second Account</span></li>'),
    '<input aria-label="Customer" value="Search text"><div data-id="CompanyName">Contact company</div><ul data-id="ownerid.fieldControl-LookupResultsDropdown_ownerid_SelectedRecordList"><li>Wrong account</li></ul>',
  ])('does not fabricate a customer from missing, ambiguous, or unrelated controls (%#)', async fields => {
    page(fields)
    expect(await PageReader.scanForErrors()).not.toHaveProperty('customerName', expect.any(String))
  })

  it('reads a raw Created On label-for value without parsing or picking adjacent Modified On', async () => {
    page(`<section><label for="created-value">Created On</label><input id="created-value" value="08/09/2026 9:07 PM">
      <label for="modified-value">Modified On</label><input id="modified-value" value="WRONG MODIFIED DATE"></section>`)
    expect(await PageReader.scanForErrors()).toMatchObject({ createdOn: '08/09/2026 9:07 PM' })
  })

  function createdOnDatetime(date = '04/17/2031', time = '6:23 PM') {
    return `<label for="created-display">Created On</label><span id="created-display"></span>
      <div data-id="createdon.fieldControl-datetime-description_container">
        ${'<div>'.repeat(8)}<input type="text" readonly aria-label="Created On" value="${date}">${'</div>'.repeat(8)}
        ${'<div>'.repeat(4)}<label>Time</label><input type="text" readonly aria-label="Created On Time" value="${time}">${'</div>'.repeat(4)}
      </div>`
  }

  it('reads deep readonly Created On datetime inputs despite a non-input label target, before generic labels', async () => {
    const fields = `${createdOnDatetime()}
      <div data-id="modifiedon.fieldControl-datetime-description_container">
        <label>Modified On</label><input type="text" readonly value="WRONG MODIFIED DATE">
      </div>`
    page(fields, createdOnDatetime('OUTSIDE MAIN', 'OUTSIDE TIME'))
    expect(await PageReader.scanForErrors()).toMatchObject({ createdOn: '04/17/2031 6:23 PM' })
    page(`<label for="generic-created">Created On</label><input id="generic-created" value="GENERIC FALLBACK">${fields}`)
    expect(await PageReader.scanForErrors()).toMatchObject({ createdOn: '04/17/2031 6:23 PM' })
  })

  it('retains label fallback for absent or empty datetime containers without leaving main', async () => {
    for (const fields of ['', createdOnDatetime(' ', '')]) {
      page(fields, createdOnDatetime())
      expect((await PageReader.scanForErrors())?.createdOn).toBeUndefined()
      page(`${fields}<label for="fallback-created">Created On</label><input id="fallback-created" value="Apr 17, 2031">`, createdOnDatetime())
      expect(await PageReader.scanForErrors()).toMatchObject({ createdOn: 'Apr 17, 2031' })
    }
  })

  it('keeps either populated datetime part as raw display text', async () => {
    page(createdOnDatetime('04/17/2031', ' '))
    expect(await PageReader.scanForErrors()).toMatchObject({ createdOn: '04/17/2031' })
    page(createdOnDatetime('', '6:23 PM'))
    expect(await PageReader.scanForErrors()).toMatchObject({ createdOn: '6:23 PM' })
  })

  it('does not combine ambiguous datetime containers or accept more than two controls', async () => {
    page(`<div data-id="createdon.fieldControl-datetime-description_container"><input value="04/17/2031"></div>
      <div data-id="createdon.fieldControl-datetime-description_container"><input value="6:23 PM"></div>`)
    expect((await PageReader.scanForErrors())?.createdOn).toBeUndefined()
    page(createdOnDatetime())
    document.querySelector('[data-id="createdon.fieldControl-datetime-description_container"]')!.insertAdjacentHTML('beforeend', '<input type="text" value="EXTRA">')
    expect((await PageReader.scanForErrors())?.createdOn).toBeUndefined()
  })

  it('excludes nested Modified On and other foreign field controls from datetime values and count', async () => {
    page(createdOnDatetime())
    document.querySelector('[data-id="createdon.fieldControl-datetime-description_container"]')!.insertAdjacentHTML('beforeend', `
      <div data-id="modifiedon.fieldControl-datetime-description_container"><div><input type="text" value="WRONG MODIFIED DATE"></div></div>
      <div data-id="ownerid.fieldControl-container"><div><input type="text" value="WRONG OWNER"></div></div>`)
    expect(await PageReader.scanForErrors()).toMatchObject({ createdOn: '04/17/2031 6:23 PM' })
  })

  it.each([
    ['form', '<input value="WRONG MODIFIED DATE">'],
    ['div', '<label>Modified On</label><input value="WRONG MODIFIED DATE">'],
    ['div', '<input aria-label="Modified On" value="WRONG MODIFIED DATE">'],
    ['div', '<input data-id="modifiedon.fieldControl-date-time-input" value="WRONG MODIFIED DATE">'],
  ])('does not expand an associated mixed-field %s container (%#)', async (tag, modified) => {
    page(`<section><span id="created-label">Created On</span>
      <${tag} aria-labelledby="created-label"><input aria-labelledby="created-label" value="08/09/2026 9:07 PM">${modified}</${tag}>
    </section>`)
    expect(await PageReader.scanForErrors()).toMatchObject({ createdOn: '08/09/2026 9:07 PM' })
  })

  it('still combines date/time in a single-field associated group', async () => {
    page(`<section><span id="created-label">Created On</span>
      <div role="group" aria-labelledby="created-label"><input value="08/09/2026"><input value="9:07 PM"></div>
    </section>`)
    expect(await PageReader.scanForErrors()).toMatchObject({ createdOn: '08/09/2026 9:07 PM' })
  })

  it.each([
    ['span', 'a1b2c3d4-1234-5678-9abc-123456789abc'],
    ['span', '{A1B2C3D4-1234-5678-9ABC-123456789ABC}'],
    ['a', 'A1B2C3D4-1234-5678-9ABC-123456789ABC'],
    ['a', '{a1b2c3d4-1234-5678-9abc-123456789abc}'],
  ])('rejects a GUID-only customer %s (%#)', async (tag, guid) => {
    page(customer(`<li><${tag}>${guid}</${tag}></li>`))
    expect((await PageReader.scanForErrors())?.customerName).toBeUndefined()
  })

  it('keeps a legitimate numeric customer name', async () => {
    page(customer('<li><a>1234567890</a></li>'))
    expect(await PageReader.scanForErrors()).toMatchObject({ customerName: '1234567890' })
  })

  it('prefers the Customer lookup in main over an unrelated outside lookup', async () => {
    page(customer('<li><a>Current Account</a></li>'), customer('<li><a>Outside Account</a></li>'))
    expect(await PageReader.scanForErrors()).toMatchObject({ customerName: 'Current Account' })
  })

  it('combines date and time sharing the Created On aria label, in display order', async () => {
    page(`<section><span id="created-label">Created On</span>
      <input aria-labelledby="created-label date-label" value="9/8/2026"><input aria-labelledby="created-label time-label" value="09:07 PM">
      <label for="modified">Modified On</label><input id="modified" value="WRONG"></section>`)
    expect(await PageReader.scanForErrors()).toMatchObject({ createdOn: '9/8/2026 09:07 PM' })
  })

  it('reads separate date/time controls in the nearest single-label field, not adjacent fields', async () => {
    page(`<section><div><label for="created-date">Created On</label><div><input id="created-date" value="08.09.2026"><input value="21:07"></div></div>
      <div><label for="modified">Modified On</label><input id="modified" value="WRONG"></div></section>`)
    expect(await PageReader.scanForErrors()).toMatchObject({ createdOn: '08.09.2026 21:07' })
  })

  it('supports a bounded exact display-label field without conventional IDs', async () => {
    page('<div><span>Created On</span><div><input value="Sep 8, 2026"><input value="9:07 PM"></div></div>')
    expect(await PageReader.scanForErrors()).toMatchObject({ createdOn: 'Sep 8, 2026 9:07 PM' })
  })

  it('supports explicitly createdon-scoped conventional controls only', async () => {
    page(`<input data-id="createdon.fieldControl-date-time-input" value="08/09/2026">
      <input data-id="createdon.fieldControl-time-input" value="21:07">
      <input data-id="modifiedon.fieldControl-date-time-input" value="WRONG">`)
    expect(await PageReader.scanForErrors()).toMatchObject({ createdOn: '08/09/2026 21:07' })
  })

  it.each([
    '',
    '<label for="created">Created On</label><input id="created" value="  ">',
    '<div><span>Created On</span></div><div><label for="modified">Modified On</label><input id="modified" value="WRONG"></div>',
    '<label for="missing">Created On</label><input aria-label="Modified On" value="WRONG">',
    '<div><span>Created On</span><div><span>Modified On</span><input value="WRONG"></div></div>',
    '<div><label for="missing">Created On</label><input value="UNASSOCIATED"></div>',
    '<input data-id="notcreatedon.fieldControl-date-time-input" value="WRONG">',
  ])('leaves unloaded, blank, or unassociated Created On missing (%#)', async fields => {
    page(fields, '<label for="outside">Created On</label><input id="outside" value="OUTSIDE MAIN">')
    expect(await PageReader.scanForErrors()).not.toHaveProperty('createdOn', expect.any(String))
  })

  it('does not retain metadata when a later tab scan has no loaded fields', async () => {
    page('<label for="created">Created On</label><input id="created" value="Original display">' + customer('<li><a>Original Account</a></li>'))
    expect(await PageReader.scanForErrors()).toMatchObject({ createdOn: 'Original display', customerName: 'Original Account' })
    page('')
    const fresh = await PageReader.scanForErrors()
    expect(fresh).not.toHaveProperty('createdOn', expect.any(String))
    expect(fresh).not.toHaveProperty('customerName', expect.any(String))
  })
})
