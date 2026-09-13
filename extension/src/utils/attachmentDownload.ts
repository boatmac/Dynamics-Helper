import { ownDataProperty } from './ownData'

export type AttachmentSource = Readonly<{
    baseUrl: string
    origin: string
    workspace: string
}>

export type AttachmentDownloadSelection =
    | { status: 'none' }
    | { status: 'matched'; downloadId: number }
    | { status: 'ambiguous' }

const MAX_URL_LENGTH = 16384
const MAX_QUERY_PARAMS = 64
const CANONICAL_UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/

// Decoded, case-insensitive credential names, including common signing aliases.
// This is a key policy, not a detector of secrets hidden in arbitrary values.
const CREDENTIAL_KEY = /^(?:auth|authorization|authentication|bearer|token|.*token|secret|.*secret|password|passwd|pwd|credential|credentials|signature|sig|key|apikey|accesskey|accesskeyid|subscriptionkey|ocpapimsubscriptionkey|sharedaccesssignature|sas|code|clientassertion)$/

function parseRequestUrl(value: unknown, origin: string, signed: boolean): URL | null {
    if (typeof value !== 'string' || !value || value.length > MAX_URL_LENGTH
        || value !== value.trim() || /[\x00-\x20\x7f\\#]/.test(value)
        || !/^https:\/\//i.test(value)) return null
    try {
        const url = new URL(value)
        const authority = value.slice(value.indexOf('//') + 2).split(/[/?]/, 1)[0]
        if (url.href.length > MAX_URL_LENGTH || url.protocol !== 'https:' || url.origin !== origin
            || url.username || url.password || authority.includes('@') || url.hash) return null

        // URLSearchParams replaces invalid UTF-8; reject it before identity normalization.
        for (const part of url.search.slice(1).split('&')) {
            for (const component of part.split('=')) decodeURIComponent(component.replace(/\+/g, ' '))
        }

        const keys = new Set<string>()
        for (const [key, entry] of url.searchParams) {
            if (keys.has(key) || keys.size >= MAX_QUERY_PARAMS) return null
            keys.add(key)
            if (key === 'partnerid' || key === 'access_token') {
                if (!signed || !entry.trim()) return null
            } else {
                const normalized = key.toLowerCase().replace(/[-_.]/g, '')
                if (normalized === 'partnerid' || CREDENTIAL_KEY.test(normalized)
                    || /^x-(?:amz|goog)-/i.test(key)) return null
            }
        }
        if (signed) {
            if (!keys.has('partnerid') || !keys.has('access_token')) return null
            // Only these two portal-added fields may differ from the captured URI.
            url.searchParams.delete('partnerid')
            url.searchParams.delete('access_token')
        }
        // Normalize query encoding on BOTH sides; retain business parameter order.
        url.search = url.searchParams.toString()
        return url.href.length <= MAX_URL_LENGTH ? url : null
    } catch {
        return null
    }
}

/** Capture one selected row's request URI, not a stable attachment identifier.
 * Keep this sensitive snapshot invocation-local: never persist or log it.
 * allowedOrigin must be a canonical HTTPS origin, without a trailing slash.
 */
export function captureAttachmentSource(
    value: unknown,
    expectedWorkspace: string,
    allowedOrigin: string,
): AttachmentSource | null {
    if (typeof expectedWorkspace !== 'string' || expectedWorkspace.length !== 36
        || !CANONICAL_UUID.test(expectedWorkspace)
        || typeof allowedOrigin !== 'string' || allowedOrigin.length > MAX_URL_LENGTH) return null
    try {
        const origin = new URL(allowedOrigin)
        if (origin.protocol !== 'https:' || origin.origin !== allowedOrigin) return null
        const url = parseRequestUrl(value, allowedOrigin, false)
        if (!url) return null
        const segments = url.pathname.split('/').map(segment => decodeURIComponent(segment))
        if (!segments.includes(expectedWorkspace)) return null
        return Object.freeze({ baseUrl: url.href, origin: allowedOrigin, workspace: expectedWorkspace })
    } catch {
        return null
    }
}

/** source is the frozen constructor result, not an untrusted wire descriptor.
 * A trusted browser adapter must supply candidates and enforce invocation scope.
 * URI correlation does not authenticate a sender, verify bytes or completion,
 * enforce a 30-second deadline, or distinguish replay of the same request URI.
 */
export function matchAttachmentDownload(source: AttachmentSource, candidate: unknown): number | null {
    try {
        if (typeof candidate !== 'object' || candidate === null
            || Object.getPrototypeOf(candidate) !== Object.prototype) return null
        // Native DownloadItem extras are allowed, but no symbols or accessors.
        // Descriptor inspection never calls getters; Proxy traps are not a sandbox.
        for (const key of Reflect.ownKeys(candidate)) {
            if (typeof key !== 'string' || ownDataProperty(candidate, key).kind !== 'value') return null
        }
        const id = ownDataProperty(candidate, 'id')
        const url = ownDataProperty(candidate, 'url')
        if (id.kind !== 'value' || typeof id.value !== 'number'
            || !Number.isSafeInteger(id.value) || id.value < 0 || url.kind !== 'value') return null
        const request = parseRequestUrl(url.value, source.origin, true)
        return request?.href === source.baseUrl ? id.value : null
    } catch {
        return null
    }
}

export function selectAttachmentDownload(
    source: AttachmentSource,
    candidates: readonly unknown[],
): AttachmentDownloadSelection {
    let downloadId: number | null = null
    for (const candidate of candidates) {
        const id = matchAttachmentDownload(source, candidate)
        if (id === null) continue
        if (downloadId !== null && downloadId !== id) return { status: 'ambiguous' }
        downloadId = id
    }
    return downloadId === null ? { status: 'none' } : { status: 'matched', downloadId }
}
