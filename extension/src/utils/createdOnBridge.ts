import { ownDataProperty } from './ownData'
import { readCurrentRecordCreatedOn, type CreatedOnResult } from './createdOnModel'

const ORIGIN = 'https://onesupport.crm.dynamics.com'
const RECORD_NUMBER = /^\d{16}(?:\d{3})?$/
const UNAVAILABLE = { status: 'unavailable' } as const

type DiagnosticOutcome = 'started' | 'invalid_request' | 'api_unavailable'
    | 'sender_extension_rejected' | 'sender_tab_rejected' | 'sender_frame_rejected'
    | 'sender_origin_rejected' | 'sender_url_rejected' | 'sender_document_missing'
    | 'injection_failed' | 'injection_timeout' | 'envelope_rejected' | 'result_unavailable'
    | 'success' | 'not_requested' | 'transport_failed' | 'request_timeout' | 'origin_changed'
    | 'identity_rejected' | 'identity_changed' | 'dom_fallback' | 'missing' | 'scan_failed'
    | 'scan_returned' | 'stale_scan' | 'invalid_snapshot' | 'identity_only' | 'edited_context'
    | 'menu_open' | 'applied' | 'hidden' | 'ownership_rejected'

// Never accept data objects or caught errors here; console failure must not affect scanning.
export function logCreatedOn(
    stage: 'worker' | 'content' | 'scan' | 'ui',
    outcome: DiagnosticOutcome,
    generation?: number,
    elapsedMs?: number,
): void {
    try {
        console.debug('[DH] Created On', stage, outcome,
            Number.isSafeInteger(generation) ? generation : null,
            typeof elapsedMs === 'number' && Number.isFinite(elapsedMs) ? Math.max(0, Math.round(elapsedMs)) : null)
    } catch { /* Diagnostics must not change the result. */ }
}

function exactData(value: unknown, keys: string[]): Record<string, unknown> | undefined {
    try {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
        const names = Reflect.ownKeys(value)
        if (names.length !== keys.length || names.some(key => typeof key !== 'string' || !keys.includes(key))) return undefined
        const data: Record<string, unknown> = {}
        for (const key of keys) {
            const field = ownDataProperty(value, key)
            if (field.kind !== 'value') return undefined
            data[key] = field.value
        }
        return data
    } catch {
        return undefined
    }
}

export function parseCreatedOnResult(value: unknown, expected: string): CreatedOnResult {
    const data = exactData(value, ['status', 'caseNumber', 'createdOnUtc'])
    if (!data || data.status !== 'ok' || !RECORD_NUMBER.test(expected) || data.caseNumber !== expected
        || typeof data.createdOnUtc !== 'string'
        || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(data.createdOnUtc)) return UNAVAILABLE
    const date = new Date(data.createdOnUtc)
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== data.createdOnUtc) return UNAVAILABLE
    return { status: 'ok', caseNumber: expected, createdOnUtc: data.createdOnUtc }
}

export async function handleReadCreatedOn(
    message: unknown,
    sender: chrome.runtime.MessageSender,
): Promise<CreatedOnResult> {
    let timer: ReturnType<typeof setTimeout> | undefined
    const started = performance.now()
    let outcome: DiagnosticOutcome = 'injection_failed'
    const timeout = Symbol('timeout')
    try {
        const data = exactData(message, ['type', 'caseNumber'])
        outcome = 'invalid_request'
        if (!data || data.type !== 'DH_READ_CREATED_ON' || typeof data.caseNumber !== 'string' || !RECORD_NUMBER.test(data.caseNumber)) return UNAVAILABLE
        outcome = 'sender_extension_rejected'
        if (typeof chrome?.runtime?.id !== 'string' || !chrome.runtime.id || sender.id !== chrome.runtime.id) return UNAVAILABLE
        outcome = 'sender_tab_rejected'
        if (!Number.isInteger(sender.tab?.id) || sender.tab!.id! < 0) return UNAVAILABLE
        outcome = 'sender_frame_rejected'
        if (sender.frameId !== 0) return UNAVAILABLE
        outcome = 'sender_origin_rejected'
        if (sender.origin !== ORIGIN) return UNAVAILABLE
        outcome = 'sender_url_rejected'
        if (typeof sender.url !== 'string' || new URL(sender.url).origin !== ORIGIN) return UNAVAILABLE
        outcome = 'sender_document_missing'
        if (typeof sender.documentId !== 'string' || !sender.documentId) return UNAVAILABLE
        outcome = 'api_unavailable'
        if (typeof chrome.scripting?.executeScript !== 'function') return UNAVAILABLE
        // Browser-owned token: preserve its representation and require an exact result match.
        const documentId = sender.documentId
        outcome = 'injection_failed'
        logCreatedOn('worker', 'started')
        const results = await Promise.race([
            chrome.scripting.executeScript({
                target: { tabId: sender.tab!.id!, documentIds: [documentId] },
                world: 'MAIN',
                func: readCurrentRecordCreatedOn,
                args: [data.caseNumber],
            }),
            new Promise<typeof timeout>(resolve => { timer = setTimeout(() => resolve(timeout), 5000) }),
        ])
        if (results === timeout) { outcome = 'injection_timeout'; return UNAVAILABLE }
        outcome = 'envelope_rejected'
        if (!Array.isArray(results) || results.length !== 1) return UNAVAILABLE
        const frame = ownDataProperty(results[0], 'frameId')
        const doc = ownDataProperty(results[0], 'documentId')
        const result = ownDataProperty(results[0], 'result')
        if (frame.kind !== 'value' || frame.value !== 0 || doc.kind !== 'value' || doc.value !== documentId || result.kind !== 'value') return UNAVAILABLE
        const parsed = parseCreatedOnResult(result.value, data.caseNumber)
        outcome = parsed.status === 'ok' ? 'success' : 'result_unavailable'
        return parsed
    } catch {
        return UNAVAILABLE
    } finally {
        if (timer !== undefined) clearTimeout(timer)
        logCreatedOn('worker', outcome, undefined, performance.now() - started)
    }
}

export async function requestCreatedOn(expected: string, generation?: number): Promise<string | undefined> {
    let timer: ReturnType<typeof setTimeout> | undefined
    const started = performance.now()
    let outcome: DiagnosticOutcome = 'not_requested'
    const timeout = Symbol('timeout')
    try {
        if (!RECORD_NUMBER.test(expected) || location.origin !== ORIGIN
            || typeof chrome === 'undefined' || typeof chrome.runtime?.sendMessage !== 'function') return undefined
        outcome = 'transport_failed'
        logCreatedOn('content', 'started', generation)
        const response = await Promise.race([
            chrome.runtime.sendMessage({ type: 'DH_READ_CREATED_ON', caseNumber: expected }),
            new Promise<typeof timeout>(resolve => { timer = setTimeout(() => resolve(timeout), 1500) }),
        ])
        if (response === timeout) { outcome = 'request_timeout'; return undefined }
        outcome = 'origin_changed'
        if (location.origin !== ORIGIN) return undefined
        const result = parseCreatedOnResult(response, expected)
        outcome = result.status === 'ok' ? 'success' : 'result_unavailable'
        return result.status === 'ok' ? `${result.createdOnUtc} (UTC)` : undefined
    } catch {
        return undefined
    } finally {
        if (timer !== undefined) clearTimeout(timer)
        logCreatedOn('content', outcome, generation, performance.now() - started)
    }
}
