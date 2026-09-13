import { describe, expect, it, vi } from 'vitest'
import { captureAttachmentSource, matchAttachmentDownload, selectAttachmentDownload } from './attachmentDownload'

const ORIGIN = 'https://api.example.test'
const WORKSPACE = '12345678-1234-4567-89ab-123456789abc'
const OTHER_WORKSPACE = '87654321-4321-4567-89ab-123456789abc'
const BASE = `${ORIGIN}/workspaces/${WORKSPACE}/attachments/request-one?filename=synthetic.txt&format=raw`
const AUTH = 'partnerid=synthetic-partner&access_token=synthetic-token'
const SOURCE = captureAttachmentSource(BASE, WORKSPACE, ORIGIN)!
const candidate = (url = `${BASE}&${AUTH}`, id = 7) => ({ id, url })

describe('captureAttachmentSource', () => {
    it('captures a frozen, normalized, case-bound request snapshot', () => {
        const source = captureAttachmentSource(BASE.replace(ORIGIN, 'https://API.EXAMPLE.TEST:443'), WORKSPACE, ORIGIN)
        expect(source).toEqual({ baseUrl: BASE, workspace: WORKSPACE, origin: ORIGIN })
        expect(Object.isFrozen(source)).toBe(true)
    })

    it('accepts a complete once-decoded workspace path segment', () => {
        expect(captureAttachmentSource(BASE.replace(WORKSPACE, `%31${WORKSPACE.slice(1)}`), WORKSPACE, ORIGIN)).not.toBeNull()
    })

    it.each([
        '', WORKSPACE.toUpperCase(), `{${WORKSPACE}}`, ` ${WORKSPACE}`,
        WORKSPACE.replaceAll('-', ''), `${WORKSPACE}0`, `${WORKSPACE}\n`,
    ])('rejects noncanonical expected workspace %s', workspace => {
        expect(captureAttachmentSource(BASE, workspace, ORIGIN)).toBeNull()
    })

    it.each([
        BASE.replace(WORKSPACE, OTHER_WORKSPACE),
        BASE.replace(WORKSPACE, `prefix-${WORKSPACE}`),
        BASE.replace(WORKSPACE, `${WORKSPACE}-suffix`),
        BASE.replace(WORKSPACE, `prefix%2F${WORKSPACE}`),
        BASE.replace(WORKSPACE, `%2531${WORKSPACE.slice(1)}`),
        BASE.replace(WORKSPACE, 'missing') + `&workspace=${WORKSPACE}`,
        BASE.replace(WORKSPACE, `${WORKSPACE}%`),
    ])('rejects a workspace absent as an exact decoded segment: %s', url => {
        expect(captureAttachmentSource(url, WORKSPACE, ORIGIN)).toBeNull()
    })

    it.each([
        '', 'http://api.example.test', `${ORIGIN}/`, `${ORIGIN}/path`,
        `${ORIGIN}?q=1`, `${ORIGIN}#`, 'https://user@api.example.test',
        'https://API.EXAMPLE.TEST', 'https://api.example.test:443',
    ])('rejects noncanonical or non-HTTPS allowed origin %s', origin => {
        expect(captureAttachmentSource(BASE, WORKSPACE, origin)).toBeNull()
    })

    it.each([
        'partnerid', 'access_token', 'ACCESS_TOKEN', 'access%5Ftoken', 'token',
        'id_token', 'refresh-token', 'Authorization', 'api_key', 'password',
        'client_secret', 'sig', 'signature', 'credential', 'code',
        'X-Amz-Credential', 'X-Goog-Signature', 'ocp-apim-subscription-key',
    ])('rejects base credential key %s', key => {
        expect(captureAttachmentSource(`${BASE}&${key}=synthetic`, WORKSPACE, ORIGIN)).toBeNull()
    })

    it('rejects duplicate decoded query keys, including identical values', () => {
        for (const suffix of ['filename=synthetic.txt', '%66ilename=other.txt', 'format=raw']) {
            expect(captureAttachmentSource(`${BASE}&${suffix}`, WORKSPACE, ORIGIN)).toBeNull()
        }
    })

    it('does not coerce unknown input', () => {
        const toString = vi.fn(() => BASE)
        for (const value of [null, undefined, 1, false, Symbol('synthetic'), { toString }]) {
            expect(captureAttachmentSource(value, WORKSPACE, ORIGIN)).toBeNull()
        }
        expect(toString).not.toHaveBeenCalled()
    })
})

describe('request URL boundary', () => {
    it.each([
        BASE.replace('https:', 'http:'),
        BASE.replace(ORIGIN, 'https://api.example.test.evil.test'),
        BASE.replace(ORIGIN, 'https://evil.test'),
        BASE.replace(ORIGIN, 'https://api.example.test:444'),
        BASE.replace(ORIGIN, 'https://user:synthetic@api.example.test'),
        BASE.replace(ORIGIN, 'https://@api.example.test'),
        BASE.replace(ORIGIN, 'https://api.example.test@evil.test'),
        `${BASE}#fragment`, `${BASE}#`, ` ${BASE}`, `${BASE}\n`,
        BASE.replace('/workspaces/', '\\workspaces/'),
        BASE.replace('https://', 'https:/'),
        BASE.replace('https:', ''), '',
    ])('rejects unsafe source and candidate URL %s', url => {
        expect(captureAttachmentSource(url, WORKSPACE, ORIGIN)).toBeNull()
        expect(matchAttachmentDownload(SOURCE, candidate(`${url}&${AUTH}`))).toBeNull()
    })

    it('enforces the 16384-character limit before normalization on both inputs', () => {
        const prefix = `${ORIGIN}/${WORKSPACE}/file?padding=`
        const atLimit = prefix + 'x'.repeat(16384 - prefix.length)
        expect(captureAttachmentSource(atLimit, WORKSPACE, ORIGIN)).not.toBeNull()
        expect(captureAttachmentSource(`${atLimit}x`, WORKSPACE, ORIGIN)).toBeNull()

        const signedPrefix = `${BASE}&partnerid=p&access_token=`
        const signedAtLimit = signedPrefix + 't'.repeat(16384 - signedPrefix.length)
        expect(matchAttachmentDownload(SOURCE, candidate(signedAtLimit))).toBe(7)
        expect(matchAttachmentDownload(SOURCE, candidate(`${signedAtLimit}t`))).toBeNull()
    })

    it('counts at most 64 query entries, including candidate authentication fields', () => {
        const prefix = `${ORIGIN}/${WORKSPACE}/file?`
        const entries = Array.from({ length: 65 }, (_, i) => `p${i}=v`)
        expect(captureAttachmentSource(prefix + entries.slice(0, 64).join('&'), WORKSPACE, ORIGIN)).not.toBeNull()
        expect(captureAttachmentSource(prefix + entries.join('&'), WORKSPACE, ORIGIN)).toBeNull()
        const base62 = prefix + entries.slice(0, 62).join('&')
        const base63 = prefix + entries.slice(0, 63).join('&')
        expect(matchAttachmentDownload(captureAttachmentSource(base62, WORKSPACE, ORIGIN)!, candidate(`${base62}&${AUTH}`))).toBe(7)
        expect(matchAttachmentDownload(captureAttachmentSource(base63, WORKSPACE, ORIGIN)!, candidate(`${base63}&${AUTH}`))).toBeNull()
    })

    it('also bounds URL length after percent encoding expands the input', () => {
        const expanded = `${BASE}&padding=${'\u00e9'.repeat(3000)}`
        expect(expanded.length).toBeLessThan(16384)
        expect(captureAttachmentSource(expanded, WORKSPACE, ORIGIN)).toBeNull()
        expect(matchAttachmentDownload(SOURCE, candidate(`${BASE}&partnerid=p&access_token=${'\u00e9'.repeat(3000)}`))).toBeNull()
    })
})

describe('matchAttachmentDownload', () => {
    it('returns only a local ID, without requiring time or declaring completion', () => {
        expect(matchAttachmentDownload(SOURCE, candidate())).toBe(7)
        expect(matchAttachmentDownload(SOURCE, {
            ...candidate(), state: 'in_progress', startTime: '2000-01-01T00:00:00.000Z',
            filename: 'renamed-locally.txt', bytesReceived: 0, totalBytes: -1, paused: false,
        })).toBe(7)
    })

    it('accepts ID zero and the largest safe integer', () => {
        for (const id of [0, Number.MAX_SAFE_INTEGER]) {
            expect(matchAttachmentDownload(SOURCE, candidate(undefined, id))).toBe(id)
        }
    })

    it('allows portal auth fields in any position, but retains business query order', () => {
        const prefix = BASE.split('?')[0]
        expect(matchAttachmentDownload(SOURCE, candidate(`${prefix}?${AUTH}&filename=synthetic.txt&format=raw`))).toBe(7)
        expect(matchAttachmentDownload(SOURCE, candidate(`${prefix}?access_token=synthetic-token&filename=synthetic.txt&partnerid=p&format=raw`))).toBe(7)
        expect(matchAttachmentDownload(SOURCE, candidate(`${prefix}?format=raw&filename=synthetic.txt&${AUTH}`))).toBeNull()
    })

    it('normalizes equivalent query encoding on both sides, without changing values', () => {
        const base = BASE.replace('synthetic.txt', 'synthetic%20file%2Etxt')
        const source = captureAttachmentSource(base, WORKSPACE, ORIGIN)!
        expect(matchAttachmentDownload(source, candidate(`${base.replace('synthetic%20file%2Etxt', 'synthetic+file.txt')}&${AUTH}`))).toBe(7)
        expect(matchAttachmentDownload(source, candidate(`${base.replace('%20', '%2B')}&${AUTH}`))).toBeNull()
    })

    it('supports a source without query parameters', () => {
        const base = BASE.split('?')[0]
        const source = captureAttachmentSource(base, WORKSPACE, ORIGIN)!
        expect(matchAttachmentDownload(source, candidate(`${base}?${AUTH}`))).toBe(7)
    })

    it('rejects malformed escapes and invalid UTF-8 instead of merging distinct requests', () => {
        for (const encoded of ['%FF', '%FE', '%C0%AF', '%ED%A0%80', '%', '%0', '%GG']) {
            const base = BASE.replace('synthetic.txt', encoded)
            expect(captureAttachmentSource(base, WORKSPACE, ORIGIN)).toBeNull()
            expect(matchAttachmentDownload(SOURCE, candidate(`${base}&${AUTH}`))).toBeNull()
        }
        const replacement = BASE.replace('synthetic.txt', '%EF%BF%BD')
        const source = captureAttachmentSource(replacement, WORKSPACE, ORIGIN)!
        expect(matchAttachmentDownload(source, candidate(`${BASE.replace('synthetic.txt', '%FF')}&${AUTH}`))).toBeNull()
    })

    it.each([
        BASE.replace(WORKSPACE, OTHER_WORKSPACE),
        BASE.replace('/attachments/', '/other-path/'),
        BASE.replace('request-one', 'request-two'),
        BASE.replace('synthetic.txt', 'changed-original.txt'),
        BASE.replace('format=raw', 'format=preview'),
        BASE.replace('&format=raw', ''),
        `${BASE}&extra=value`,
        `${BASE}&filename=synthetic.txt`,
        `${BASE}&%66ilename=synthetic.txt`,
    ])('rejects changed request identity or extra/duplicate fields: %s', url => {
        expect(matchAttachmentDownload(SOURCE, candidate(`${url}&${AUTH}`))).toBeNull()
    })

    it.each([
        '', 'partnerid=p', 'access_token=t', 'partnerid=&access_token=t',
        'partnerid=p&access_token=', 'partnerid=%20&access_token=t',
        'partnerid=p&access_token=%20', `${AUTH}&partnerid=other`,
        `${AUTH}&access_token=other`, `${AUTH}&access%5Ftoken=synthetic-token`,
        'PartnerId=p&access_token=t', 'partnerid=p&ACCESS_TOKEN=t',
        `${AUTH}&refresh_token=synthetic`, `${AUTH}&sig=synthetic`,
    ])('requires exactly the two nonempty portal auth fields: %s', auth => {
        expect(matchAttachmentDownload(SOURCE, candidate(`${BASE}&${auth}`))).toBeNull()
    })

    it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, '7', null, undefined, 7n])('rejects invalid download ID %s', id => {
        expect(matchAttachmentDownload(SOURCE, { ...candidate(), id })).toBeNull()
    })

    it('requires own id and url data fields without coercion', () => {
        const toString = vi.fn(() => `${BASE}&${AUTH}`)
        for (const value of [{ url: `${BASE}&${AUTH}` }, { id: 7 }, { id: 7, url: '' },
            { id: 7, url: { toString } }, { id: { toString }, url: `${BASE}&${AUTH}` }]) {
            expect(matchAttachmentDownload(SOURCE, value)).toBeNull()
        }
        expect(toString).not.toHaveBeenCalled()
    })

    it('rejects non-plain and null-prototype candidates', () => {
        for (const value of [null, undefined, true, 'synthetic', 7, Symbol('synthetic'),
            Object.assign([], candidate()), Object.assign(new Date(0), candidate()),
            Object.assign(() => undefined, candidate()), Object.create(candidate()),
            Object.assign(Object.create(null), candidate())]) {
            expect(matchAttachmentDownload(SOURCE, value)).toBeNull()
        }
    })

    it('rejects symbols and all accessors, including unconsumed and hidden fields, without invoking them', () => {
        const getter = vi.fn(() => { throw new Error('synthetic-secret') })
        for (const key of ['id', 'url', 'startTime', 'state', 'unrelated', 'toString']) {
            const value = candidate()
            Object.defineProperty(value, key, { get: getter, enumerable: false })
            expect(matchAttachmentDownload(SOURCE, value)).toBeNull()
        }
        const value = candidate()
        Object.defineProperty(value, Symbol('synthetic'), { get: getter })
        expect(matchAttachmentDownload(SOURCE, value)).toBeNull()
        expect(matchAttachmentDownload(SOURCE, { ...candidate(), [Symbol('synthetic')]: 1 })).toBeNull()
        expect(getter).not.toHaveBeenCalled()
    })

    it('contains reflection failures without exposing exception strings', () => {
        const revoked = Proxy.revocable(candidate(), {})
        revoked.revoke()
        const throwing = new Proxy(candidate(), { ownKeys: () => { throw new Error('synthetic-secret') } })
        expect(matchAttachmentDownload(SOURCE, revoked.proxy)).toBeNull()
        expect(matchAttachmentDownload(SOURCE, throwing)).toBeNull()
    })
})

describe('selectAttachmentDownload', () => {
    it('returns none for empty or nonmatching candidates', () => {
        expect(selectAttachmentDownload(SOURCE, [])).toEqual({ status: 'none' })
        expect(selectAttachmentDownload(SOURCE, [null, candidate(BASE)])).toEqual({ status: 'none' })
    })

    it('returns only the unique matching ID, ignoring unrelated same-filename candidates', () => {
        const unrelated = candidate(`${BASE.replace(WORKSPACE, OTHER_WORKSPACE)}&${AUTH}`, 9)
        expect(selectAttachmentDownload(SOURCE, [unrelated, candidate(undefined, 0), null])).toEqual({ status: 'matched', downloadId: 0 })
    })

    it('deduplicates matching observations of the same ID, not their status', () => {
        expect(selectAttachmentDownload(SOURCE, [candidate(), { ...candidate(), state: 'complete' }])).toEqual({ status: 'matched', downloadId: 7 })
    })

    it('returns ambiguous for two distinct matching IDs, regardless of order or filename', () => {
        const first = { ...candidate(undefined, 0), filename: 'same.txt' }
        const second = { ...candidate(undefined, 8), filename: 'same.txt' }
        expect(selectAttachmentDownload(SOURCE, [first, second, first])).toEqual({ status: 'ambiguous' })
        expect(selectAttachmentDownload(SOURCE, [second, first])).toEqual({ status: 'ambiguous' })
    })
})
