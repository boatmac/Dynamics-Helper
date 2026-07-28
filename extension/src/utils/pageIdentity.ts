import type { ScrapedData } from './pageReader'

export type PageIdentity = `case:${string}` | `title:${string}`

export interface PageIdentitySnapshot {
    identity: PageIdentity | null
    caseNumber: string
}

function readIdentityString(
    descriptors: PropertyDescriptorMap,
    key: 'caseNumber' | 'ticketTitle',
): { kind: 'absent' | 'invalid' } | { kind: 'value'; value: string } {
    try {
        const descriptor = descriptors[key]
        if (!descriptor) return { kind: 'absent' }
        if (!Object.hasOwn(descriptor, 'value')) return { kind: 'invalid' }
        return typeof descriptor.value === 'string'
            ? { kind: 'value', value: descriptor.value }
            : { kind: 'invalid' }
    } catch {
        return { kind: 'invalid' }
    }
}

// Title fallback guards live display only; durable storage remains case-number keyed.
export function parsePageIdentitySnapshot(
    value: unknown,
): PageIdentitySnapshot | null {
    try {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return null
        }
        const descriptors = Object.getOwnPropertyDescriptors(value)
        const caseNumber = readIdentityString(descriptors, 'caseNumber')
        const ticketTitle = readIdentityString(descriptors, 'ticketTitle')
        if (caseNumber.kind === 'invalid' || ticketTitle.kind === 'invalid') return null
        const exactCase = caseNumber.kind === 'value' ? caseNumber.value : ''
        const exactTitle = ticketTitle.kind === 'value' ? ticketTitle.value : ''
        return {
            identity: exactCase.length > 0
                ? `case:${exactCase}`
                : exactTitle.length > 0
                    ? `title:${exactTitle}`
                    : null,
            caseNumber: exactCase,
        }
    } catch {
        return null
    }
}

export function parsePageIdentity(value: unknown): PageIdentity | null {
    const snapshot = parsePageIdentitySnapshot(value)
    return snapshot ? snapshot.identity : null
}

const SCRAPED_STRING_FIELDS = [
    'errorText',
    'ticketTitle',
    'productCategory',
    'caseNumber',
    'severity',
    'statusReason',
    'description',
    'context',
    'timestamp',
    'source',
] as const

export function parseScrapedDataSnapshot(value: unknown): ScrapedData | null {
    try {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return null
        }
        const descriptors = Object.getOwnPropertyDescriptors(value)
        const result: ScrapedData = {}
        for (const key of SCRAPED_STRING_FIELDS) {
            const descriptor = descriptors[key]
            if (!descriptor) continue
            if (!Object.hasOwn(descriptor, 'value')) return null
            if (descriptor.value === undefined) continue
            if (typeof descriptor.value !== 'string') return null
            result[key] = descriptor.value
        }
        return result
    } catch {
        return null
    }
}
