// FAB re-hydration hook — reads dh_last_analysis / dh_pending_analysis on
// mount and on caseNumber change, returns popover state + isAnalyzing flag
// for FAB to consume.
//
// See:
//   docs/superpowers/specs/2026-06-03-analysis-result-persistence-design.md
//   docs/superpowers/plans/2026-06-03-analysis-result-persistence.md
//
// Why extracted from FAB.tsx: FAB has heavy side effects (DOM scraping,
// MutationObserver, telemetry init, settings load). Testing the hook in
// isolation via renderHook keeps R-I1..R-I5 invariants tractable.

import { useCallback, useEffect, useState } from 'react'
import {
    getLastAnalysis,
    getPendingAnalysis,
    markSeen,
    STALE_WINDOW_MS,
    MAX_PENDING_DISPLAY_AGE_MS,
} from '../utils/analysisStore'
import type { LastAnalysis } from '../utils/analysisStore'

export interface HydratedPopover {
    isOpen: true
    status: 'success' | 'error'
    title: string
    content: string
    savedTo?: string
}

export interface HydrationResult {
    /** Non-null when an unseen, fresh, case-matching result exists. */
    popover: HydratedPopover | null
    /** True when a fresh, case-matching pending marker exists. */
    isAnalyzing: boolean
    /** Mark the current result as seen and close the popover. */
    dismissPopover: () => Promise<void>
}

function shouldOpen(
    last: LastAnalysis | null,
    caseNumber: string,
): boolean {
    if (!last || !caseNumber) return false
    if (last.caseNumber !== caseNumber) return false
    if (last.seen) return false
    if (Date.now() - last.timestamp > STALE_WINDOW_MS) return false
    return true
}

/**
 * Hydrate persisted analyze state for the given case.
 *
 * Behavior contract (spec § 5):
 * - R-I1: matching unseen result inside STALE_WINDOW_MS → popover.isOpen=true
 * - R-I2: dismissPopover() flips storage seen=true; future mounts skip
 * - R-I3: caseNumber mismatch → popover=null
 * - R-I4: result older than STALE_WINDOW_MS → popover=null
 * - R-I5: matching pending inside MAX_PENDING_DISPLAY_AGE_MS → isAnalyzing=true
 *
 * Re-runs whenever caseNumber changes (user navigates between cases).
 * Empty caseNumber is treated as "not ready" and short-circuits everything
 * (FAB calls the hook before the page scrape resolves a case ID).
 */
export function useAnalysisHydration(caseNumber: string): HydrationResult {
    const [popover, setPopover] = useState<HydratedPopover | null>(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    useEffect(() => {
        let cancelled = false

        async function hydrate() {
            if (!caseNumber) {
                if (!cancelled) {
                    setPopover(null)
                    setIsAnalyzing(false)
                }
                return
            }

            const [last, pending] = await Promise.all([
                getLastAnalysis(),
                getPendingAnalysis(),
            ])
            if (cancelled) return

            if (shouldOpen(last, caseNumber)) {
                // Non-null per shouldOpen.
                const l = last!
                setPopover({
                    isOpen: true,
                    status: l.status,
                    title: l.title,
                    content: l.content,
                    savedTo: l.savedTo,
                })
            } else {
                setPopover(null)
            }

            const pendingFresh =
                !!pending &&
                pending.caseNumber === caseNumber &&
                Date.now() - pending.startTime <= MAX_PENDING_DISPLAY_AGE_MS
            setIsAnalyzing(pendingFresh)
        }

        void hydrate()

        return () => {
            cancelled = true
        }
    }, [caseNumber])

    const dismissPopover = useCallback(async () => {
        await markSeen()
        setPopover(null)
    }, [])

    return { popover, isAnalyzing, dismissPopover }
}
