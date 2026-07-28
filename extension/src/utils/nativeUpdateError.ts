import { ownDataProperty } from './ownData'
import { safeErrorText } from './safeErrorText'

export interface NativeUpdateErrorEvent {
    type: 'NATIVE_UPDATE_ERROR'
    payload: { error: string }
}

export interface NativeUpdateErrorDeliveryDeps {
    sendRuntime: (event: NativeUpdateErrorEvent) => Promise<unknown>
    queryActiveTabs: () => Promise<Array<{ id?: number }>>
    sendTab: (tabId: number, event: NativeUpdateErrorEvent) => Promise<unknown>
}

export function normalizeNativeUpdateError(
    value: unknown,
): NativeUpdateErrorEvent {
    const payload = ownDataProperty(value, 'payload')
    const payloadError = payload.kind === 'value'
        ? ownDataProperty(payload.value, 'error')
        : { kind: 'invalid' as const }
    const payloadMessage = payload.kind === 'value'
        ? ownDataProperty(payload.value, 'message')
        : { kind: 'invalid' as const }
    const error = ownDataProperty(value, 'error')
    const message = ownDataProperty(value, 'message')
    return {
        type: 'NATIVE_UPDATE_ERROR',
        payload: {
            error: safeErrorText([
                payloadError.kind === 'value' ? payloadError.value : undefined,
                payloadMessage.kind === 'value' ? payloadMessage.value : undefined,
                error.kind === 'value' ? error.value : undefined,
                message.kind === 'value' ? message.value : undefined,
            ], 'Update check failed.'),
        },
    }
}

export function handleNativeUpdateError(
    raw: unknown,
    deps: NativeUpdateErrorDeliveryDeps,
): Promise<void> {
    const event = normalizeNativeUpdateError(raw)
    console.warn('[DH-SW] Update check failed')
    return Promise.allSettled([
        deps.sendRuntime(event),
        deps.queryActiveTabs().then(tabs => Promise.allSettled(
            tabs.flatMap(tab => tab.id === undefined
                ? []
                : [deps.sendTab(tab.id, event)]),
        )),
    ]).then(() => undefined)
}
