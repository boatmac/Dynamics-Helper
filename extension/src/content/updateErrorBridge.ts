import { ownDataProperty } from '../utils/ownData'
import { safeErrorText } from '../utils/safeErrorText'

export const UPDATE_ERROR_DOM_EVENT = 'dh-update-error' as const
export interface UpdateErrorDomDetail { error: string }
export function forwardNativeUpdateErrorToWindow(
    message: unknown,
    target: EventTarget = window,
): boolean {
    const type = ownDataProperty(message, 'type')
    const payload = ownDataProperty(message, 'payload')
    if (type.kind !== 'value' || type.value !== 'NATIVE_UPDATE_ERROR') return false
    const candidate = payload.kind === 'value'
        ? ownDataProperty(payload.value, 'error')
        : { kind: 'invalid' as const }
    const error = safeErrorText([
        candidate.kind === 'value' ? candidate.value : undefined,
    ], 'Update check failed.')
    target.dispatchEvent(new CustomEvent<UpdateErrorDomDetail>(
        UPDATE_ERROR_DOM_EVENT,
        { detail: { error } },
    ))
    return true
}
