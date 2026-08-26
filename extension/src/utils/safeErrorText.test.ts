import { describe, expect, it, vi } from 'vitest'
import { safeErrorText } from './safeErrorText'

describe('safeErrorText', () => {
  it('returns the first non-empty string unchanged', () => {
    expect(safeErrorText(
      [null, '', 'first safe text', 'second safe text'],
      'fallback',
    )).toBe('first safe text')
  })

  it('uses the fixed fallback without coercing unknown values', () => {
    const secret = 'SECRET-SAFE-ERROR-TEXT'
    const toString = vi.fn(() => {
      throw new Error(secret)
    })

    expect(safeErrorText([
      { secret, toString },
      [{ secret }],
      () => secret,
      Symbol(secret),
      null,
    ], 'fixed fallback')).toBe('fixed fallback')
    expect(toString).not.toHaveBeenCalled()
  })
})
