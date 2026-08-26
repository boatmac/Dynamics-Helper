import { describe, expect, it } from 'vitest'
import { applyCurrentUserPrompt } from './analysisPrompt'

const BASE = '## Case Number\n\n1234567890123456\n\n## Description\n\nFailure'

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
