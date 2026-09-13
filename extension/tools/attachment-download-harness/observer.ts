import { matchAttachmentDownload, type AttachmentSource } from '../../src/utils/attachmentDownload'

type Downloads = Pick<typeof chrome.downloads, 'search' | 'onCreated' | 'onChanged'>

export type DownloadObservation = Readonly<{
    status: 'complete' | 'unmatched' | 'incomplete' | 'ambiguous' | 'blocked'
        | 'trigger_failed' | 'observer_failed'
    /** Saturates at eight; never includes browser IDs, URLs or local paths. */
    matchedCount: number
}>

/** Browser metadata observation only, not qualification of downloaded file bytes.
 * The caller owns the spent marker. No history scan, trigger retry or global chrome access.
 */
export function observeDownload(
    source: AttachmentSource,
    downloads: Downloads,
    trigger: () => Promise<boolean>,
    timeoutMs = 30_000,
): Promise<DownloadObservation> {
    return new Promise(resolve => {
        const ids = new Set<number>()
        const checks = new Map<number, {
            revision: number
            pending: boolean
            status: 'complete' | 'incomplete' | 'blocked'
        }>()
        let settled = false
        let armed = false
        let triggered = false
        let failed = false
        let ambiguous = false
        let deadline: ReturnType<typeof setTimeout> | undefined
        let finalSweep: ReturnType<typeof setTimeout> | undefined

        function finish(status: DownloadObservation['status']) {
            if (settled) return
            settled = true
            armed = false
            clearTimeout(deadline)
            clearTimeout(finalSweep)
            // Attempt both removals even if registration or one removal failed.
            try { downloads.onCreated.removeListener(onCreated) } catch { failed = true }
            try { downloads.onChanged.removeListener(onChanged) } catch { failed = true }
            resolve({ status: failed && status !== 'trigger_failed' ? 'observer_failed' : status,
                matchedCount: ids.size })
        }

        function observerFailed() {
            if (settled) return
            failed = true
            if (triggered) finish('observer_failed')
        }

        async function query(id: number) {
            if (settled) return
            const check = checks.get(id)!
            const revision = ++check.revision
            check.pending = true
            try {
                const items = await downloads.search({ id })
                if (settled || revision !== check.revision) return
                if (!Array.isArray(items) || items.length !== 1
                    || matchAttachmentDownload(source, items[0]) !== id) {
                    observerFailed()
                    return
                }
                const item = items[0]
                check.pending = false
                check.status = item.danger !== 'safe' ? 'blocked'
                    : item.state === 'complete' && typeof item.fileSize === 'number'
                        && Number.isFinite(item.fileSize) && item.fileSize >= 0
                        ? 'complete' : 'incomplete'
            } catch {
                if (settled || revision !== check.revision) return
                observerFailed()
            }
        }

        function onCreated(item: chrome.downloads.DownloadItem) {
            if (!armed || settled) return
            const id = matchAttachmentDownload(source, item)
            if (id === null || ids.has(id)) return
            if (ids.size > 0) ambiguous = true
            if (ids.size === 8) return
            ids.add(id)
            checks.set(id, { revision: 0, pending: false, status: 'incomplete' })
            void query(id)
        }

        function onChanged(delta: chrome.downloads.DownloadDelta) {
            if (!armed || settled || !Number.isSafeInteger(delta.id) || !ids.has(delta.id)) return
            void query(delta.id)
        }

        if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647) {
            finish('observer_failed')
            return
        }
        try {
            downloads.onCreated.addListener(onCreated)
            downloads.onChanged.addListener(onChanged)
            deadline = setTimeout(() => {
                if (!triggered) return finish('trigger_failed')
                if (failed || [...checks.values()].some(check => check.pending)) {
                    return finish('observer_failed')
                }
                finish(ambiguous ? 'ambiguous' : ids.size === 0 ? 'unmatched'
                    : checks.values().next().value!.status)
            }, timeoutMs)
            // Reserve up to 250 ms inside the deadline for the final ID-only sweep.
            // Events remain armed until the deadline; unresolved queries fail closed.
            finalSweep = setTimeout(() => {
                for (const id of ids) void query(id)
            }, Math.max(0, timeoutMs - Math.min(250, timeoutMs / 10)))
            armed = true
            void (async () => {
                try {
                    const result = await trigger()
                    if (settled) return
                    if (result !== true) return finish('trigger_failed')
                    triggered = true
                    if (failed) finish('observer_failed')
                } catch {
                    if (!settled) finish('trigger_failed')
                }
            })()
        } catch {
            finish('observer_failed')
        }
    })
}
