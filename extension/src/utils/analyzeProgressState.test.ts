import { describe, expect, it } from 'vitest'
import { parseAnalyzeProgress, type AnalyzeProgressEvent } from './analyzeProgress'
import { analyzeProgressLabel, analyzeProgressReducer, type AnalyzeProgressState } from './analyzeProgressState'

function event(seq: number, patch: Partial<AnalyzeProgressEvent> = {}): AnalyzeProgressEvent {
    return { version: 1, seq, stage: 'agent', state: 'running', elapsedMs: seq * 100, ...patch }
}

function start(requestId = 'a') {
    return analyzeProgressReducer(null, { type: 'start', requestId })!
}

function progress(state: AnalyzeProgressState, value: AnalyzeProgressEvent | string, requestId = 'a') {
    return analyzeProgressReducer(state, { type: 'progress', requestId, event: value })!
}

describe('Analyze progress state', () => {
    it('rejects duplicate, out-of-order and foreign-request events without mutation', () => {
        const state = progress(start(), event(3))
        expect(progress(state, event(3, { stage: 'report' }))).toBe(state)
        expect(progress(state, event(2))).toBe(state)
        expect(progress(state, event(4), 'old')).toBe(state)
    })

    it('keeps at most 40 recent events without losing an active parallel tool', () => {
        let state = progress(start(), event(1, { stage: 'tool', service: 'webiq', toolId: 'tool-1' }))
        for (let seq = 2; seq <= 45; seq++) state = progress(state, event(seq))
        expect(state.activity).toHaveLength(40)
        expect(state.activity[0].seq).toBe(6)
        expect(state.activeTools['tool-1']).toMatchObject({ seq: 1, state: 'running' })
    })

    it('tracks concurrent aliases separately and removes only the completed tool', () => {
        let state = start()
        for (let seq = 1; seq <= 2; seq++) {
            state = progress(state, event(seq, { stage: 'tool', service: 'workiq', toolId: `tool-${seq}` }))
        }
        state = progress(state, event(3, { stage: 'tool', state: 'failed', service: 'workiq', toolId: 'tool-1' }))
        expect(Object.keys(state.activeTools)).toEqual(['tool-2'])
        expect(state.activity.map(value => value.toolId)).toEqual(['tool-1', 'tool-2', 'tool-1'])
    })

    it('allows retry phase regression and keeps previous attempts and elapsed time', () => {
        let state = progress(start(), event(1, { stage: 'response', elapsedMs: 5000 }))
        state = progress(state, event(2, { stage: 'session_reconnecting', elapsedMs: 100 }))
        state = progress(state, event(3, { stage: 'session_resuming' }))
        expect(state.current).toMatchObject({ stage: 'session_resuming' })
        expect(state.elapsedMs).toBe(5000)
        expect(state.activity.map(value => value.stage)).toEqual(['response', 'session_reconnecting', 'session_resuming'])
    })

    it('caps active tools at 128 without eviction and never revives an overflow alias', () => {
        let state = start()
        for (let seq = 1; seq <= 130; seq++) {
            state = progress(state, event(seq, { stage: 'tool', service: 'webiq', toolId: `tool-${seq}` }))
        }
        expect(Object.keys(state.activeTools)).toHaveLength(128)
        expect(state.activeTools['tool-1']).toBeDefined()
        expect(state.activeTools['tool-129']).toBeUndefined()
        state = progress(state, event(131, { stage: 'tool', service: 'webiq', toolId: 'tool-1', state: 'succeeded' }))
        state = progress(state, event(132, { stage: 'tool', service: 'webiq', toolId: 'tool-129' }))
        expect(Object.keys(state.activeTools)).toHaveLength(127)
        state = progress(state, event(133, { stage: 'tool', service: 'webiq', toolId: 'tool-131' }))
        expect(Object.keys(state.activeTools)).toHaveLength(128)
        expect(state.activity).toHaveLength(40)
    })

    it('fails closed on reused aliases and late starts even after their history was evicted', () => {
        let state = progress(start(), event(1, { stage: 'tool', service: 'webiq', toolId: 'tool-1' }))
        state = progress(state, event(2, { stage: 'tool', service: 'other', toolId: 'tool-1' }))
        expect(state.activeTools['tool-1'].service).toBe('webiq')
        state = progress(state, event(3, { stage: 'tool', service: 'webiq', toolId: 'tool-1', state: 'failed' }))
        for (let seq = 4; seq <= 45; seq++) state = progress(state, event(seq))
        state = progress(state, event(46, { stage: 'tool', service: 'webiq', toolId: 'tool-1' }))
        expect(state.current).toMatchObject({ stage: 'agent' })
        expect(state.activeTools['tool-1']).toBeUndefined()
        state = progress(state, event(47, { stage: 'tool', service: 'webiq', toolId: 'tool-2', state: 'succeeded' }))
        state = progress(state, event(48, { stage: 'tool', service: 'webiq', toolId: 'tool-2' }))
        expect(state.activeTools['tool-2']).toBeUndefined()
    })

    it('does not reopen a stopped or settled request through a reused start', () => {
        const stopped = analyzeProgressReducer(start(), { type: 'stop', requestId: 'a' })!
        expect(analyzeProgressReducer(stopped, { type: 'start', requestId: 'a' })).toBe(stopped)
        const settled = analyzeProgressReducer(stopped, { type: 'settle', requestId: 'a', outcome: 'success' })!
        expect(analyzeProgressReducer(settled, { type: 'start', requestId: 'a' })).toBe(settled)
        expect(analyzeProgressReducer(settled, { type: 'start', requestId: 'b' })?.accepting).toBe(true)
    })

    it.each(['success', 'failed'] as const)('only a matching final response settles %s and blocks late progress', outcome => {
        const running = progress(start(), event(1, { stage: 'report', state: 'succeeded' }))
        expect(running.settled).toBeNull()
        expect(analyzeProgressReducer(running, { type: 'settle', requestId: 'old', outcome })).toBe(running)
        const settled = analyzeProgressReducer(running, { type: 'settle', requestId: 'a', outcome })!
        expect(settled.settled).toBe(outcome)
        expect(progress(settled, event(2))).toBe(settled)
        expect(progress(settled, 'Preparing prompt...')).toBe(settled)
        expect(Object.keys(settled.activeTools)).toHaveLength(0)
    })

    it('resets all request state including session ID and rejects an old final response', () => {
        const previous = progress(start(), event(1, { stage: 'session_ready', state: 'succeeded', sessionId: '12345678-1234-1234-1234-123456789012' }))
        const next = analyzeProgressReducer(previous, { type: 'start', requestId: 'b' })!
        expect(next).toEqual(start('b'))
        expect(analyzeProgressReducer(next, { type: 'settle', requestId: 'a', outcome: 'failed' })).toBe(next)
        expect(progress(next, event(2))).toBe(next)
    })

    it('stops events at the full response but leaves final outcome to the terminal path', () => {
        const running = progress(start(), event(1))
        expect(analyzeProgressReducer(running, { type: 'stop', requestId: 'old' })).toBe(running)
        const stopped = analyzeProgressReducer(running, { type: 'stop', requestId: 'a' })!
        expect(progress(stopped, event(2))).toBe(stopped)
        expect(stopped.settled).toBeNull()
        expect(analyzeProgressReducer(stopped, { type: 'settle', requestId: 'a', outcome: 'failed' })?.settled).toBe('failed')
    })

    it('uses fixed localized legacy labels and does not downgrade v1 to legacy', () => {
        const safe = parseAnalyzeProgress('https://private.invalid/?sig=secret')!
        const legacy = progress(start(), safe)
        expect(analyzeProgressLabel(legacy.current, key => key)).toBe('analyzeProgressGeneral')
        expect(analyzeProgressLabel('Preparing prompt...', key => key)).toBe('analyzeProgressPrepare')
        expect(analyzeProgressLabel('Waiting for DTM sign-in (30 seconds)...', key => key)).toBe('analyzeProgressDtmAuth')
        const structured = progress(legacy, event(1))
        expect(progress(structured, 'Preparing prompt...')).toBe(structured)
    })
})
