import {
    handleAnalyzeForward,
    parseAnalyzeForwardRequest,
    type AnalyzeForwardResponse,
    type AnalyzeNativeAction,
} from './analyzeBridge'

export interface AuthorizedAnalyzeTransport {
    send(forwarded: AnalyzeNativeAction): Promise<unknown>
}

type AnalyzeSendAuthorization =
    | { allowed: false; response: AnalyzeForwardResponse }
    | { allowed: true; response: Promise<unknown> }

export interface AnalyzeRequestHandlerDeps {
    acquireAuthorizedTransport(
        forwarded: Readonly<AnalyzeNativeAction>,
    ): Promise<
        | { allowed: false; response: AnalyzeForwardResponse }
        | {
              allowed: true
              transport: AuthorizedAnalyzeTransport
              authorizeSend?: (
                  forwarded: Readonly<AnalyzeNativeAction>,
              ) => Promise<AnalyzeSendAuthorization>
          }
    >
}

export type NonAnalyzeNativeMessageDecision =
    | { ok: true; forwarded: Readonly<Record<string, unknown>> }
    | {
          ok: false
          response: {
              status: 'error'
              error: 'Invalid Extension Native message metadata.'
              error_code: 'invalid_native_message_metadata'
          }
      }

export async function handleAnalyzeRequest(
    inner: unknown,
    deps: AnalyzeRequestHandlerDeps,
): Promise<AnalyzeForwardResponse> {
    const parsed = parseAnalyzeForwardRequest(inner)
    if (!parsed.ok) return parsed.response

    const acquisition = await deps.acquireAuthorizedTransport(parsed.forwarded)
    if (!acquisition.allowed) return acquisition.response

    return handleAnalyzeForward(
        parsed.forwarded,
        parsed.context,
        {
            send: async action => {
                if (acquisition.authorizeSend) {
                    const authorization = await acquisition.authorizeSend(action)
                    return authorization.response
                }
                return acquisition.transport.send(action)
            },
        },
    )
}

function nonAnalyzeDenied(): NonAnalyzeNativeMessageDecision {
    return {
        ok: false,
        response: {
            status: 'error',
            error: 'Invalid Extension Native message metadata.',
            error_code: 'invalid_native_message_metadata',
        },
    }
}

export function guardNonAnalyzeNativeMessage(
    inner: unknown,
): NonAnalyzeNativeMessageDecision {
    try {
        if (typeof inner !== 'object' || inner === null || Array.isArray(inner)) {
            return nonAnalyzeDenied()
        }
        const descriptors = Object.getOwnPropertyDescriptors(inner)
        const keys = Reflect.ownKeys(descriptors)
        const output: Record<string, unknown> = {}
        let requestIdPresent = false
        for (const key of keys) {
            if (typeof key !== 'string') return nonAnalyzeDenied()
            if (key === '_persist' || key === 'extension_warnings' || key === 'toJSON') {
                return nonAnalyzeDenied()
            }
            const holder = Reflect.getOwnPropertyDescriptor(descriptors, key)
            if (!holder || !Object.hasOwn(holder, 'value')) return nonAnalyzeDenied()
            const descriptor = holder.value as PropertyDescriptor
            if (key === 'requestId') {
                requestIdPresent = true
                if (
                    !descriptor.enumerable
                    || !Object.hasOwn(descriptor, 'value')
                    || typeof descriptor.value !== 'string'
                    || descriptor.value.length === 0
                ) return nonAnalyzeDenied()
            }
            if (!descriptor.enumerable) continue
            if (!Object.hasOwn(descriptor, 'value')) return nonAnalyzeDenied()
            Object.defineProperty(output, key, {
                value: descriptor.value,
                enumerable: true,
                writable: true,
                configurable: true,
            })
        }
        const action = Object.getOwnPropertyDescriptor(output, 'action')
        if (
            !action
            || typeof action.value !== 'string'
            || action.value === 'analyze_error'
        ) return nonAnalyzeDenied()
        if (requestIdPresent && !Object.hasOwn(output, 'requestId')) {
            return nonAnalyzeDenied()
        }
        Object.defineProperty(output, 'toJSON', {
            value: undefined,
            enumerable: false,
            writable: false,
            configurable: false,
        })
        return { ok: true, forwarded: Object.freeze(output) }
    } catch {
        return nonAnalyzeDenied()
    }
}
