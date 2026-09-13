import type { AnalyzeProgressEvent } from './analyzeProgress'

export const ANALYZE_ACTIVITY_LIMIT = 40
export const ANALYZE_ACTIVE_TOOL_LIMIT = 128

export type AnalyzeProgressState = Readonly<{
    requestId: string
    settled: 'success' | 'failed' | null
    accepting: boolean
    seq: number
    current: AnalyzeProgressEvent | string | null
    elapsedMs: number
    sessionId?: string
    activity: readonly AnalyzeProgressEvent[]
    activeTools: Readonly<Record<string, AnalyzeProgressEvent>>
    highestToolOrdinal: string
}>

export type AnalyzeProgressAction =
    | { type: 'start'; requestId: string }
    | { type: 'progress'; requestId: string; event: AnalyzeProgressEvent | string }
    | { type: 'stop'; requestId: string }
    | { type: 'settle'; requestId: string; outcome: 'success' | 'failed' }

// The caller parses input and checks request ownership; page gates affect display only.
export function analyzeProgressReducer(
    state: AnalyzeProgressState | null,
    action: AnalyzeProgressAction,
): AnalyzeProgressState | null {
    if (action.type === 'start') {
        if (state?.requestId === action.requestId) return state
        return {
            requestId: action.requestId, settled: null, accepting: true, seq: 0, current: null,
            elapsedMs: 0, activity: [], activeTools: {}, highestToolOrdinal: '',
        }
    }
    if (!state || state.requestId !== action.requestId || state.settled) return state
    if (action.type === 'settle') {
        return { ...state, settled: action.outcome, accepting: false, activeTools: {} }
    }
    if (!state.accepting) return state
    if (action.type === 'stop') return { ...state, accepting: false }
    const event = action.event
    if (typeof event === 'string') {
        // A legacy notification cannot replace sequenced v1 progress.
        return state.seq > 0 ? state : { ...state, current: event }
    }
    if (event.seq <= state.seq) return state
    const activeTools = { ...state.activeTools }
    let highestToolOrdinal = state.highestToolOrdinal
    if (event.stage === 'tool' && event.toolId) {
        const ordinal = event.toolId.slice('tool-'.length)
        // Host aliases increase across the entire request. Compare decimal strings
        // without precision loss; a high-water mark avoids unbounded tombstones.
        const newAlias = ordinal.length > highestToolOrdinal.length
            || (ordinal.length === highestToolOrdinal.length && ordinal > highestToolOrdinal)
        if (newAlias) highestToolOrdinal = ordinal
        if (event.state === 'running') {
            if (!newAlias || Object.keys(activeTools).length >= ANALYZE_ACTIVE_TOOL_LIMIT) {
                return { ...state, seq: event.seq, highestToolOrdinal }
            }
            activeTools[event.toolId] = event
        } else {
            delete activeTools[event.toolId]
        }
    }
    return {
        ...state,
        seq: event.seq,
        current: event,
        elapsedMs: Math.max(state.elapsedMs, event.elapsedMs),
        sessionId: event.sessionId ?? state.sessionId,
        activity: [...state.activity, event].slice(-ANALYZE_ACTIVITY_LIMIT),
        // Active parallel tools are not evicted with the bounded event history.
        activeTools,
        highestToolOrdinal,
    }
}

const stageKeys: Record<AnalyzeProgressEvent['stage'], string> = {
    prepare: 'analyzeProgressPrepare',
    session_resuming: 'analyzeProgressResuming',
    session_creating: 'analyzeProgressCreating',
    session_reused: 'analyzeProgressReused',
    session_ready: 'analyzeProgressReady',
    session_reconnecting: 'analyzeProgressReconnecting',
    auth: 'analyzeProgressAuth',
    agent: 'analyzeProgressAgent',
    tool: 'analyzeProgressTool',
    response: 'analyzeProgressResponse',
    report: 'analyzeProgressReport',
}

const stateKeys: Record<AnalyzeProgressEvent['state'], string> = {
    running: 'analyzeProgressRunning',
    succeeded: 'analyzeProgressSucceeded',
    failed: 'analyzeProgressFailed',
    unavailable: 'analyzeProgressStateUnavailable',
    needs_auth: 'analyzeProgressNeedsAuth',
}

const legacyKeys = new Map([
    ['Checking authentication...', 'analyzeProgressAuth'],
    ['Waiting for DTM sign-in (30 seconds)...', 'analyzeProgressDtmAuth'],
    ['Preparing prompt...', 'analyzeProgressPrepare'],
    ['Waiting for Copilot agent...', 'analyzeProgressAgent'],
    ['Session expired. Reconnecting...', 'analyzeProgressReconnecting'],
    ['Processing response...', 'analyzeProgressResponse'],
])

export function analyzeProgressLabel(
    current: AnalyzeProgressState['current'],
    t: (key: string) => string,
): string {
    if (typeof current === 'string') {
        return t(legacyKeys.get(current) ?? 'analyzeProgressGeneral')
    }
    if (!current) return t('analyzeProgressGeneral')
    return `${t(stageKeys[current.stage])}: ${t(stateKeys[current.state])}`
}

const serviceKeys: Record<NonNullable<AnalyzeProgressEvent['service']>, string> = {
    workiq: 'analyzeProgressServiceWorkiq', webiq: 'analyzeProgressServiceWebiq',
    ado: 'analyzeProgressServiceAdo', mslearn: 'analyzeProgressServiceMslearn',
    kusto: 'analyzeProgressServiceKusto', enghub: 'analyzeProgressServiceEnghub',
    icm: 'analyzeProgressServiceIcm', research: 'analyzeProgressServiceResearch',
    filesystem: 'analyzeProgressServiceFilesystem', other: 'analyzeProgressServiceOther',
}

export function analyzeToolLabel(event: AnalyzeProgressEvent, t: (key: string) => string): string {
    return `${t(serviceKeys[event.service ?? 'other'])} (${event.toolId})`
}
