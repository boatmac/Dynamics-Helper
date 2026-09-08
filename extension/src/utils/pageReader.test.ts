import { afterEach, describe, it, expect } from 'vitest'
import { ID_REGEX, PageReader } from './pageReader'

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
})

describe('D365 case metadata', () => {
  afterEach(() => document.body.replaceChildren())

  function page(fields: string, outside = '') {
    document.body.innerHTML = `<main role="main"><h1>Synthetic case</h1>${fields}</main>${outside}`
  }

  function customer(items: string) {
    return `<ul data-id="customerid.fieldControl-LookupResultsDropdown_customerid_SelectedRecordList">${items}</ul>`
  }

  it.each(['a', 'label', 'span'])('reads the selected light-DOM customer %s, not icon or remove controls', async tag => {
    page('', customer(`<li>
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
    page('<label for="created">Created On</label><input id="created" value="Original display">', customer('<li><a>Original Account</a></li>'))
    expect(await PageReader.scanForErrors()).toMatchObject({ createdOn: 'Original display', customerName: 'Original Account' })
    page('')
    const fresh = await PageReader.scanForErrors()
    expect(fresh).not.toHaveProperty('createdOn', expect.any(String))
    expect(fresh).not.toHaveProperty('customerName', expect.any(String))
  })
})
