import { describe, expect, it } from 'vitest'
import { getTranslation } from './translations'
import {
    localizePromptSourceError,
    normalizeErrorCode,
} from './promptSourceErrors'

const copy: Record<string, string> = {
    promptErrorDhCoreMissing: 'core missing',
    promptErrorDhCoreUnreadable: 'core unreadable',
    promptErrorDhSpecificUnreadable: 'DH instructions unreadable',
    promptErrorRepositoryMissing: 'repository instructions missing',
    promptErrorRepositoryUnreadable: 'repository instructions unreadable',
    promptErrorUserPromptUnreadable: 'user prompt unreadable',
}
const t = (key: string) => copy[key] ?? key

describe('prompt source error localization', () => {
    it.each([
        ['dh_core_prompt_missing', 'core missing'],
        ['dh_core_prompt_unreadable', 'core unreadable'],
        ['dh_specific_instructions_unreadable', 'DH instructions unreadable'],
        ['repository_instructions_missing', 'repository instructions missing'],
        ['repository_instructions_unreadable', 'repository instructions unreadable'],
        ['user_prompt_unreadable', 'user prompt unreadable'],
    ])('maps %s and ignores fallback', (code, expected) => {
        expect(localizePromptSourceError(code, 'HOST FALLBACK', t)).toBe(expected)
    })

    it('returns fallback for unknown or missing codes', () => {
        expect(localizePromptSourceError('future_code', 'fallback', t)).toBe('fallback')
        expect(localizePromptSourceError('toString', 'fallback', t)).toBe('fallback')
        expect(localizePromptSourceError(undefined, 'fallback', t)).toBe('fallback')
    })

    it('preserves only non-empty string codes', () => {
        expect(normalizeErrorCode('future_code')).toBe('future_code')
        expect(normalizeErrorCode('')).toBeUndefined()
        expect(normalizeErrorCode(42)).toBeUndefined()
    })

    it.each([
        'dh_core_prompt_missing',
        'dh_core_prompt_unreadable',
        'dh_specific_instructions_unreadable',
        'repository_instructions_missing',
        'repository_instructions_unreadable',
        'user_prompt_unreadable',
    ])('has real English and Chinese copy for %s', code => {
        const english = localizePromptSourceError(
            code,
            'fallback',
            key => getTranslation(key, 'en'),
        )
        const chinese = localizePromptSourceError(
            code,
            'fallback',
            key => getTranslation(key, 'zh'),
        )
        expect(english).not.toBe('fallback')
        expect(chinese).not.toBe('fallback')
        expect(english).not.toBe(chinese)
        expect(`${english} ${chinese}`.toLowerCase()).not.toMatch(
            /re-auth|authenticate|重新登录/,
        )
    })
})
