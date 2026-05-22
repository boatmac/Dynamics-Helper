import { describe, it, expect } from 'vitest'
import { ID_REGEX } from './pageReader'

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
