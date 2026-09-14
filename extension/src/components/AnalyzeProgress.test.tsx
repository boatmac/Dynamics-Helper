import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AnalyzeProgress } from './AnalyzeProgress'
import { PrefsLanguageProvider } from '../utils/i18n'
import { parseAnalyzeProgress, type AnalyzeProgressEvent } from '../utils/analyzeProgress'
import { analyzeProgressReducer, type AnalyzeProgressState } from '../utils/analyzeProgressState'

vi.mock('../utils/prefs', () => ({ usePrefs: () => ({ prefs: { language: 'en' } }) }))

const SESSION = '12345678-1234-1234-1234-123456789012'
function stateWith(events: Array<AnalyzeProgressEvent | string>) {
    let state = analyzeProgressReducer(null, { type: 'start', requestId: 'a' })!
    for (const event of events) state = analyzeProgressReducer(state, { type: 'progress', requestId: 'a', event })!
    return state
}
function event(seq: number, patch: Partial<AnalyzeProgressEvent> = {}): AnalyzeProgressEvent {
    return { version: 1, seq, stage: 'agent', state: 'running', elapsedMs: seq * 1000, ...patch }
}
function view(state: AnalyzeProgressState | null, language: 'en' | 'zh' = 'en') {
    return <PrefsLanguageProvider language={language}><AnalyzeProgress state={state} /></PrefsLanguageProvider>
}

describe('AnalyzeProgress', () => {
    afterEach(() => vi.unstubAllGlobals())

    it('renders localized phase and elapsed time with only the current phase live', () => {
        const state = stateWith([event(1, { stage: 'session_resuming' })])
        const rendered = render(view(state))
        expect(screen.getByRole('status')).toHaveTextContent('Resuming session: Running')
        expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
        expect(screen.getByText('Elapsed: 1.0 s')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: /Recent activity/ }))
        expect(screen.getByRole('list', { name: 'Recent activity' }).closest('[aria-live]')).toBeNull()
        rendered.rerender(view(state, 'zh'))
        expect(screen.getByRole('status')).not.toHaveTextContent('session_resuming')
        expect(screen.getByRole('status')).not.toHaveTextContent('Resuming session')
    })

    it('renders fixed legacy fallback and unavailable hydrated details without invented phase or time', () => {
        const rendered = render(view(null))
        expect(screen.getByRole('status')).toHaveTextContent('Progress details unavailable')
        expect(screen.queryByText(/Elapsed:/)).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Recent activity/ })).not.toBeInTheDocument()
        rendered.rerender(view(stateWith([parseAnalyzeProgress('secret text')!])))
        expect(screen.getByRole('status')).toHaveTextContent('Analysis in progress')
        expect(screen.queryByText(/secret text/)).not.toBeInTheDocument()
        rendered.rerender(view(stateWith(['Preparing prompt...'])))
        expect(screen.getByRole('status')).toHaveTextContent('Preparing analysis')
    })

    it('distinguishes a new local request waiting for Host from unavailable hydrated details', () => {
        const rendered = render(view(stateWith([])))
        expect(screen.getByRole('status')).toHaveTextContent('Analysis in progress')
        expect(screen.queryByText(/Elapsed:/)).not.toBeInTheDocument()
        rendered.rerender(view(null))
        expect(screen.getByRole('status')).toHaveTextContent('Progress details unavailable')
    })

    it('shows the exact DTM legacy label before Host sequenced progress without replacing it afterward', () => {
        const notice = parseAnalyzeProgress('Waiting for DTM sign-in (30 seconds)...')!
        const rendered = render(view(stateWith([notice])))
        expect(screen.getByRole('status')).toHaveTextContent('Waiting for DTM sign-in (30 seconds)...')
        rendered.rerender(view(stateWith([notice, event(1), notice])))
        expect(screen.getByRole('status')).toHaveTextContent('Copilot analysis: Running')
        expect(screen.queryByText('Waiting for DTM sign-in (30 seconds)...')).not.toBeInTheDocument()
    })

    it('localizes the DTM legacy label when the language provider changes to Chinese', () => {
        const state = stateWith([parseAnalyzeProgress('Waiting for DTM sign-in (30 seconds)...')!])
        const rendered = render(view(state, 'en'))
        expect(screen.getByRole('status').textContent).toBe('Waiting for DTM sign-in (30 seconds)...')
        rendered.rerender(view(state, 'zh'))
        expect(screen.getByRole('status').textContent).toBe('等待 DTM 登录（最多 30 秒）...')
    })

    it('bounds history at 40, rejects stale seq and retains active parallel tools outside history', () => {
        const state = stateWith([
            event(1, { stage: 'tool', service: 'webiq', toolId: 'tool-1' }),
            event(2, { stage: 'tool', service: 'webiq', toolId: 'tool-2' }),
            ...Array.from({ length: 43 }, (_, index) => event(index + 3)),
            event(2, { stage: 'auth' }),
        ])
        render(view(state))
        expect(screen.getByRole('status')).toHaveTextContent('Copilot analysis: Running')
        expect(within(screen.getByRole('list', { name: 'Active tools' })).getAllByRole('listitem')).toHaveLength(2)
        const toggle = screen.getByRole('button', { name: 'Recent activity (40)' })
        expect(toggle).toHaveAttribute('aria-expanded', 'false')
        fireEvent.click(toggle)
        expect(toggle).toHaveAttribute('aria-expanded', 'true')
        expect(within(screen.getByRole('list', { name: 'Recent activity' })).getAllByRole('listitem')).toHaveLength(40)
    })

    it.each(['success', 'failed'] as const)('shows the authoritative %s terminal state rather than a successful stage', outcome => {
        const running = stateWith([event(1, { stage: 'report', state: 'succeeded' })])
        const rendered = render(view(running))
        expect(screen.getByRole('status')).toHaveTextContent('Writing report: Succeeded')
        const settled = analyzeProgressReducer(running, { type: 'settle', requestId: 'a', outcome })!
        rendered.rerender(view(settled))
        expect(screen.getByRole('status')).toHaveTextContent(outcome === 'success' ? 'Analysis complete' : 'Analysis did not complete')
    })

    it('copies only the validated session ID on explicit action and uses fixed failure text', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined)
        vi.stubGlobal('navigator', { clipboard: { writeText } })
        const parsed = parseAnalyzeProgress(event(1, { stage: 'session_ready', state: 'succeeded', sessionId: SESSION }))!
        render(view(stateWith([parsed])))
        expect(screen.getByText(SESSION)).toBeInTheDocument()
        expect(writeText).not.toHaveBeenCalled()
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy session ID' })))
        expect(writeText).toHaveBeenCalledExactlyOnceWith(SESSION)
        expect(screen.getByText('Session ID copied')).toBeInTheDocument()
        writeText.mockRejectedValueOnce(new Error('sensitive clipboard details'))
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy session ID' })))
        expect(screen.getByText('Could not copy session ID')).toBeInTheDocument()
        expect(screen.queryByText(/sensitive clipboard/)).not.toBeInTheDocument()
    })
})
