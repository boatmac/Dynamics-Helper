import { describe, expect, it } from 'vitest'
import { applyCurrentUserPrompt, applyIrSlaSnapshot, formatIrSlaSnapshot } from './analysisPrompt'

const BASE = '## Case Number\n\n1234567890123456\n\n## Description\n\nFailure'

const IR = { irSlaStatus: 'Succeeded' as const, irSlaCapturedAt: '2031-04-17T10:23:00.123Z' }
const IR_SECTION = '## IR SLA Snapshot\n\nStatus: Succeeded\nCaptured at (UTC): 2031-04-17T10:23:00.123Z\nCountdown: unknown\nDeadline (UTC): unknown\n\nCaptured observation, not a live timer or execution budget.'

describe('IR SLA snapshot', () => {
  it('formats only the captured status and UTC timestamp without deriving countdown or deadline', () => {
    expect(formatIrSlaSnapshot(IR)).toBe(IR_SECTION)
    expect(formatIrSlaSnapshot({ ...IR, irSlaStatus: 'unknown' })).toBe(
      IR_SECTION.replace('Status: Succeeded', 'Status: Unknown'),
    )
  })

  it('replaces stale known metadata with unknown and unavailable when the scan has no IR fields', () => {
    const result = applyIrSlaSnapshot(`${BASE}\n\n${IR_SECTION}`, {})
    expect(result).toBe(`${BASE}\n\n${IR_SECTION.replace('Status: Succeeded', 'Status: Unknown').replace(IR.irSlaCapturedAt, 'unavailable')}`)
    expect(result).not.toMatch(/\d{4}-\d{2}-\d{2}T/)
  })

  it('adds one block to fresh raw context and does not accumulate blocks on repeated assembly', () => {
    const first = applyIrSlaSnapshot(BASE, IR)
    expect(first).toBe(`${BASE}\n\n${IR_SECTION}`)
    expect(applyIrSlaSnapshot(first, IR)).toBe(first)
  })

  it('replaces duplicate reserved sections but retains other headings and edited fields byte-for-byte', () => {
    const before = `${BASE}\n\n`
    const between = '## Customer Name\r\n\r\nEdited account  \r\n\r\n'
    const after = '# User Notes\n\nKeep my notes.'
    const context = `${before}## IR SLA Snapshot\n\nSTALE\n### Detail\nOLD\n${between}## IR SLA Snapshot\n\nDUPLICATE\n${after}`
    expect(applyIrSlaSnapshot(context, IR)).toBe(`${before}${between}${after}\n\n${IR_SECTION}`)
  })

  it.each([
    ['```markdown', '```', '~~~'],
    ['~~~~markdown', '~~~~', '```\r\n~~~'],
    ['   ````markdown', '   `````', '```\r\n~~~'],
  ])('preserves reserved-looking headings inside a %s fence', (open, close, interior) => {
    const fenced = `${open}\r\n## IR SLA Snapshot\r\nEXAMPLE\r\n## User Prompt\r\nLITERAL PROMPT\r\n${interior}\r\n## More example\r\n${close}`
    const context = `${BASE}\n\n${fenced}\n\n## IR SLA Snapshot\n\nSTALE\n\n## Notes\n\nKeep`
    expect(applyIrSlaSnapshot(context, IR)).toBe(`${BASE}\n\n${fenced}\n\n## Notes\n\nKeep\n\n${IR_SECTION}`)
  })

  it('preserves ordinary headings, inline mentions, and indented code', () => {
    const context = `${BASE}\n\n### IR SLA Snapshot\nUser detail\n\n## IR SLA Snapshot Notes\nKeep\n\n    ## IR SLA Snapshot\n    Code\n\nAn inline ## IR SLA Snapshot mention.`
    expect(applyIrSlaSnapshot(context, IR)).toBe(`${context}\n\n${IR_SECTION}`)
  })

  it('leaves an existing User Prompt untouched and inserts IR before it', () => {
    const prompt = '## User Prompt\r\n\r\nPersonal prompt\r\n## IR SLA Snapshot\r\nPrompt-owned example  \r\n'
    expect(applyIrSlaSnapshot(`${BASE}\n\n${prompt}`, IR)).toBe(`${BASE}\n\n${IR_SECTION}\n\n${prompt}`)
  })

  it('discards the old User Prompt before refreshing IR and appends the current prompt last', () => {
    const stale = `${BASE}\n\n## User Prompt\n\nOLD PROMPT\n\n${IR_SECTION}`
    const withoutPrompt = applyCurrentUserPrompt(stale, undefined)
    const result = applyCurrentUserPrompt(applyIrSlaSnapshot(withoutPrompt, IR), 'CURRENT PROMPT')
    expect(result).toBe(`${BASE}\n\n${IR_SECTION}\n\n## User Prompt\n\nCURRENT PROMPT`)
    expect(applyCurrentUserPrompt(result, undefined)).toBe(`${BASE}\n\n${IR_SECTION}`)
  })

  it('preserves fenced IR examples through the composed pipeline and replaces the canonical trailing User Prompt', () => {
    const body = `${BASE}\n\n\`\`\`markdown\n## IR SLA Snapshot\nLITERAL IR EXAMPLE\n\`\`\`\n\n## Notes\n\nEdited user notes.`
    const stale = `${body}\n\n## IR SLA Snapshot\n\nSTALE IR\n\n## User Prompt\n\nOLD PROMPT\n\n## Prompt Detail\n\nOLD DETAIL`
    const withoutPrompt = applyCurrentUserPrompt(stale, undefined)
    const result = applyCurrentUserPrompt(applyIrSlaSnapshot(withoutPrompt, IR), 'CURRENT PROMPT')

    expect(result).toBe(`${body}\n\n${IR_SECTION}\n\n## User Prompt\n\nCURRENT PROMPT`)
    expect(applyCurrentUserPrompt(result, undefined)).toBe(`${body}\n\n${IR_SECTION}`)
  })
})

describe('applyCurrentUserPrompt', () => {
  it('appends the current prompt to a normal context exactly once', () => {
    const result = applyCurrentUserPrompt(BASE, 'CURRENT PROMPT')
    expect(result).toBe(`${BASE}\n\n## User Prompt\n\nCURRENT PROMPT`)
    expect(result.match(/^## User Prompt$/gm)).toHaveLength(1)
  })

  it('replaces a stale trailing prompt in preformatted context', () => {
    const stale = `${BASE}\n\n## User Prompt\n\nSTALE PROMPT`
    const result = applyCurrentUserPrompt(stale, 'CURRENT PROMPT')
    expect(result).toBe(`${BASE}\n\n## User Prompt\n\nCURRENT PROMPT`)
    expect(result).not.toContain('STALE PROMPT')
  })

  it('removes a stale trailing section when the current prompt is empty', () => {
    const stale = `${BASE}\n\n## User Prompt\n\nSTALE PROMPT`
    expect(applyCurrentUserPrompt(stale, '')).toBe(BASE)
    expect(applyCurrentUserPrompt(stale, '   ')).toBe(BASE)
  })

  it('replaces from the first authoritative marker when duplicate sections exist', () => {
    const duplicated = [
      BASE,
      '## User Prompt',
      '',
      'FIRST STALE PROMPT',
      '',
      '## User Prompt',
      '',
      'SECOND STALE PROMPT',
    ].join('\n\n')

    const result = applyCurrentUserPrompt(duplicated, 'CURRENT PROMPT')

    expect(result).toBe(`${BASE}\n\n## User Prompt\n\nCURRENT PROMPT`)
    expect(result).not.toContain('FIRST STALE PROMPT')
    expect(result).not.toContain('SECOND STALE PROMPT')
  })

  it('removes every stale duplicate section when the current prompt is empty', () => {
    const duplicated = `${BASE}\n\n## User Prompt\n\nFIRST STALE\n\n## User Prompt\n\nSECOND STALE`

    expect(applyCurrentUserPrompt(duplicated, '')).toBe(BASE)
  })

  it('preserves context bytes when there is no prompt section or current prompt', () => {
    const context = `${BASE}  \n`
    expect(applyCurrentUserPrompt(context, '')).toBe(context)
  })

  it('replaces the whole trailing prompt when its content has markdown headings', () => {
    const stale = `${BASE}\n\n## User Prompt\n\nSTALE\n\n## Prompt Detail\n\nOLD`
    expect(applyCurrentUserPrompt(stale, 'CURRENT')).toBe(
      `${BASE}\n\n## User Prompt\n\nCURRENT`,
    )
  })

  it('uses the latest value across repeated Analyze assembly without duplication', () => {
    const first = applyCurrentUserPrompt(BASE, 'FIRST')
    const second = applyCurrentUserPrompt(first, 'SECOND')
    const repeated = applyCurrentUserPrompt(second, 'SECOND')

    expect(repeated).toBe(`${BASE}\n\n## User Prompt\n\nSECOND`)
    expect(repeated).not.toContain('FIRST')
    expect(repeated.match(/^## User Prompt$/gm)).toHaveLength(1)
  })
})
