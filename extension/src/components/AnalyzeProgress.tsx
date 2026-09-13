import { useId, useState } from 'react'
import { Activity, ChevronDown, ChevronRight, Copy } from 'lucide-react'
import { useTranslation } from '../utils/i18n'
import {
    ANALYZE_ACTIVITY_LIMIT,
    analyzeProgressLabel,
    analyzeToolLabel,
    type AnalyzeProgressState,
} from '../utils/analyzeProgressState'

export function AnalyzeProgress({ state }: { state: AnalyzeProgressState | null }) {
    const { t } = useTranslation()
    const historyId = useId()
    const [expanded, setExpanded] = useState(false)
    const [copyResult, setCopyResult] = useState<{ sessionId: string; key: string } | null>(null)
    const activeTools = Object.values(state?.activeTools ?? {})
    const phase = state?.settled
        ? t(state.settled === 'success' ? 'analyzeProgressComplete' : 'analyzeProgressEnded')
        : state === null
            ? t('analyzeProgressUnavailable')
            : analyzeProgressLabel(state.current, t)

    return (
        <section aria-label={t('analyzeProgressGeneral')} style={{ marginTop: 10, padding: 10, border: '1px solid #E2E8F0', borderRadius: 8, background: '#F8FAFC', color: '#334155', fontSize: 12, overflowWrap: 'anywhere' }}>
            <div role="status" aria-live="polite" aria-atomic="true" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={14} aria-hidden="true" />
                <span>{phase}</span>
            </div>
            {state?.current && typeof state.current !== 'string' && (
                <div style={{ marginTop: 4, color: '#64748B' }}>
                    {t('analyzeProgressElapsed')}: {(state.elapsedMs / 1000).toFixed(1)} {t('analyzeProgressSeconds')}
                </div>
            )}
            {state?.sessionId && (
                <div style={{ marginTop: 8 }}>
                    <div>{t('analyzeProgressSession')}: <code style={{ userSelect: 'text' }}>{state.sessionId}</code></div>
                    <button type="button" className="dh-action-btn dh-btn-secondary" style={{ marginTop: 4 }} onClick={async () => {
                        const sessionId = state.sessionId!
                        try {
                            await navigator.clipboard.writeText(sessionId)
                            setCopyResult({ sessionId, key: 'analyzeProgressCopied' })
                        } catch {
                            setCopyResult({ sessionId, key: 'analyzeProgressCopyFailed' })
                        }
                    }}>
                        <Copy size={12} aria-hidden="true" /> {t('analyzeProgressCopy')}
                    </button>
                    {copyResult?.sessionId === state.sessionId && <div role="status">{t(copyResult.key)}</div>}
                </div>
            )}
            {activeTools.length > 0 && (
                <div style={{ marginTop: 8 }}>
                    <div>{t('analyzeProgressActive')} ({activeTools.length})</div>
                    <ul aria-label={t('analyzeProgressActive')} style={{ margin: '4px 0', paddingLeft: 18, maxHeight: 120, overflowY: 'auto' }}>
                        {activeTools.slice(0, ANALYZE_ACTIVITY_LIMIT).map(event => <li key={event.toolId}>{analyzeToolLabel(event, t)}</li>)}
                    </ul>
                    {activeTools.length > ANALYZE_ACTIVITY_LIMIT && <div>{t('analyzeProgressMoreActive')}: {activeTools.length - ANALYZE_ACTIVITY_LIMIT}</div>}
                </div>
            )}
            {Boolean(state?.activity.length) && (
                <>
                    <button type="button" aria-expanded={expanded} aria-controls={historyId} onClick={() => setExpanded(value => !value)} style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'transparent', padding: '8px 0 0', color: '#475569', cursor: 'pointer' }}>
                        {expanded ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
                        {t('analyzeProgressHistory')} ({state?.activity.length})
                    </button>
                    <ol id={historyId} hidden={!expanded} aria-label={t('analyzeProgressHistory')} style={{ margin: '6px 0 0', paddingLeft: 22, maxHeight: 160, overflowY: 'auto' }}>
                        {state?.activity.map(event => (
                            <li key={event.seq} style={{ marginTop: 4 }}>
                                {(event.elapsedMs / 1000).toFixed(1)} {t('analyzeProgressSeconds')} / {analyzeProgressLabel(event, t)}
                                {event.stage === 'tool' && <> / {analyzeToolLabel(event, t)}</>}
                            </li>
                        ))}
                    </ol>
                </>
            )}
        </section>
    )
}
