import { parseAnalyzeProgress, type AnalyzeProgressEvent } from './analyzeProgress'
import { ownDataProperty } from './ownData'

export type AnalyzeProgressMessage = Readonly<{
    requestId: string
    payload: AnalyzeProgressEvent | string
}>

// Content and FAB share this isolated-world module, never a page-visible DOM bus.
const listeners = new Set<(message: AnalyzeProgressMessage) => void>()

export function subscribeAnalyzeProgress(listener: (message: AnalyzeProgressMessage) => void): () => void {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
}

export function publishAnalyzeProgress(value: unknown): void {
    const requestId = ownDataProperty(value, 'requestId')
    const candidate = ownDataProperty(value, 'payload')
    if (requestId.kind !== 'value' || typeof requestId.value !== 'string' || !requestId.value
        || candidate.kind !== 'value') return
    const payload = parseAnalyzeProgress(candidate.value)
    if (payload === null) return
    const message = Object.freeze({ requestId: requestId.value, payload })
    for (const listener of [...listeners]) {
        try {
            listener(message)
        } catch {
            // One consumer must not block others or expose payloads in diagnostics.
        }
    }
}
