import { ownDataProperty } from './ownData'
import { readCurrentRecordCreatedOn, type CreatedOnResult } from './createdOnModel'

const ORIGIN = 'https://onesupport.crm.dynamics.com'
const RECORD_NUMBER = /^\d{16}(?:\d{3})?$/
const UNAVAILABLE = { status: 'unavailable' } as const

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
    try {
        const data = exactData(message, ['type', 'caseNumber'])
        if (!data || data.type !== 'DH_READ_CREATED_ON' || typeof data.caseNumber !== 'string' || !RECORD_NUMBER.test(data.caseNumber)) return UNAVAILABLE
        if (typeof chrome?.runtime?.id !== 'string' || !chrome.runtime.id || sender.id !== chrome.runtime.id
            || !Number.isInteger(sender.tab?.id) || sender.tab!.id! < 0 || sender.frameId !== 0
            || sender.origin !== ORIGIN || typeof sender.url !== 'string' || new URL(sender.url).origin !== ORIGIN
            || typeof sender.documentId !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(sender.documentId)
            || typeof chrome.scripting?.executeScript !== 'function') return UNAVAILABLE
        const documentId = sender.documentId
        const results = await Promise.race([
            chrome.scripting.executeScript({
                target: { tabId: sender.tab!.id!, documentIds: [documentId] },
                world: 'MAIN',
                func: readCurrentRecordCreatedOn,
                args: [data.caseNumber],
            }),
            new Promise<undefined>(resolve => { timer = setTimeout(() => resolve(undefined), 5000) }),
        ])
        if (!Array.isArray(results) || results.length !== 1) return UNAVAILABLE
        const frame = ownDataProperty(results[0], 'frameId')
        const doc = ownDataProperty(results[0], 'documentId')
        const result = ownDataProperty(results[0], 'result')
        if (frame.kind !== 'value' || frame.value !== 0 || doc.kind !== 'value' || doc.value !== documentId || result.kind !== 'value') return UNAVAILABLE
        return parseCreatedOnResult(result.value, data.caseNumber)
    } catch {
        return UNAVAILABLE
    } finally {
        if (timer !== undefined) clearTimeout(timer)
    }
}

export async function requestCreatedOn(expected: string): Promise<string | undefined> {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
        if (!RECORD_NUMBER.test(expected) || location.origin !== ORIGIN
            || typeof chrome === 'undefined' || typeof chrome.runtime?.sendMessage !== 'function') return undefined
        const response = await Promise.race([
            chrome.runtime.sendMessage({ type: 'DH_READ_CREATED_ON', caseNumber: expected }),
            new Promise<undefined>(resolve => { timer = setTimeout(() => resolve(undefined), 1500) }),
        ])
        if (location.origin !== ORIGIN) return undefined
        const result = parseCreatedOnResult(response, expected)
        return result.status === 'ok' ? `${result.createdOnUtc} (UTC)` : undefined
    } catch {
        return undefined
    } finally {
        if (timer !== undefined) clearTimeout(timer)
    }
}
