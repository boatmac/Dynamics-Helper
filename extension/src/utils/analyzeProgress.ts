import { ownDataProperty } from './ownData'

const STAGES = [
    'prepare', 'session_resuming', 'session_creating', 'session_reused',
    'session_ready', 'session_reconnecting', 'auth', 'agent', 'tool',
    'response', 'report',
] as const
const STATES = ['running', 'succeeded', 'failed', 'unavailable', 'needs_auth'] as const
const SERVICES = [
    'workiq', 'webiq', 'ado', 'mslearn', 'kusto', 'enghub', 'icm',
    'research', 'filesystem', 'other',
] as const

export type AnalyzeProgressEvent = Readonly<{
    version: 1
    seq: number
    stage: typeof STAGES[number]
    state: typeof STATES[number]
    elapsedMs: number
    service?: typeof SERVICES[number]
    toolId?: string
    sessionId?: string
}>

export type AnalyzeProgressTarget = Readonly<{
    tabId: number
    frameId: 0
    documentId: string
}>

const LEGACY_MESSAGES = [
    'Analysis in progress',
    'Checking authentication...',
    'Waiting for DTM sign-in (30 seconds)...',
    'Auth check timed out, continuing...',
    'Auth check skipped, continuing...',
    'Preparing prompt...',
    'Waiting for Copilot agent...',
    'Session expired. Reconnecting...',
    'Processing response...',
    'Pinging...',
    'Checking health...',
    'Updating configuration...',
] as const
const REQUIRED = ['version', 'seq', 'stage', 'state', 'elapsedMs']
const OPTIONAL = ['service', 'toolId', 'sessionId']

// Project only closed data; neither unknown legacy text nor candidate objects escape.
export function parseAnalyzeProgress(value: unknown): AnalyzeProgressEvent | string | null {
    if (typeof value === 'string') {
        if (!value) return null
        if (value.length <= 512) {
            const known = LEGACY_MESSAGES.find(message => message === value)
            if (known) return known
            const match = /^Copilot is analyzing \(max ([1-9][0-9]{0,15}) min\)\.\.\.$/.exec(value)
            if (match && match[0] === value && Number.isSafeInteger(Number(match[1]))) {
                return `Copilot is analyzing (max ${Number(match[1])} min)...`
            }
        }
        return 'Analysis in progress'
    }
    try {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
        const prototype = Object.getPrototypeOf(value)
        if (prototype !== Object.prototype && prototype !== null) return null
        const data: Record<string, unknown> = Object.create(null)
        for (const key of Reflect.ownKeys(value)) {
            if (typeof key !== 'string' || (!REQUIRED.includes(key) && !OPTIONAL.includes(key))) return null
            const descriptor = Object.getOwnPropertyDescriptor(value, key)
            if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) return null
            data[key] = descriptor.value
        }
        if (REQUIRED.some(key => !Object.hasOwn(data, key))) return null
        if (data.version !== 1
            || typeof data.seq !== 'number' || !Number.isSafeInteger(data.seq) || data.seq <= 0
            || typeof data.elapsedMs !== 'number' || !Number.isSafeInteger(data.elapsedMs) || data.elapsedMs < 0
            || !STAGES.some(stage => stage === data.stage)
            || !STATES.some(state => state === data.state)) return null
        if (Object.hasOwn(data, 'service') && !SERVICES.some(service => service === data.service)) return null
        if (Object.hasOwn(data, 'toolId') && (data.stage !== 'tool'
            || typeof data.toolId !== 'string' || data.toolId.length > 128
            || !/^tool-[1-9][0-9]*(?![\s\S])/.test(data.toolId))) return null
        if (data.stage === 'tool' && (!Object.hasOwn(data, 'service') || !Object.hasOwn(data, 'toolId'))) return null
        if (Object.hasOwn(data, 'sessionId') && (data.stage !== 'session_ready' || data.state !== 'succeeded'
            || typeof data.sessionId !== 'string'
            || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?![\s\S])/.test(data.sessionId))) return null
        return Object.freeze({ ...data }) as AnalyzeProgressEvent
    } catch {
        return null
    }
}

export function captureAnalyzeProgressTarget(
    sender: unknown,
    extensionId: string,
): AnalyzeProgressTarget | undefined {
    try {
        const id = ownDataProperty(sender, 'id')
        const tab = ownDataProperty(sender, 'tab')
        const tabId = ownDataProperty(tab.kind === 'value' ? tab.value : undefined, 'id')
        const frameId = ownDataProperty(sender, 'frameId')
        const documentId = ownDataProperty(sender, 'documentId')
        const origin = ownDataProperty(sender, 'origin')
        const url = ownDataProperty(sender, 'url')
        const allowedOrigin = 'https://onesupport.crm.dynamics.com'
        if (typeof extensionId !== 'string' || !extensionId || id.kind !== 'value' || id.value !== extensionId
            || tabId.kind !== 'value' || typeof tabId.value !== 'number' || !Number.isSafeInteger(tabId.value) || tabId.value < 0
            || frameId.kind !== 'value' || frameId.value !== 0
            || documentId.kind !== 'value' || typeof documentId.value !== 'string' || !documentId.value
            || origin.kind !== 'value' || origin.value !== allowedOrigin
            || url.kind !== 'value' || typeof url.value !== 'string' || new URL(url.value).origin !== allowedOrigin) return undefined
        return Object.freeze({ tabId: tabId.value, frameId: 0, documentId: documentId.value })
    } catch {
        return undefined
    }
}
