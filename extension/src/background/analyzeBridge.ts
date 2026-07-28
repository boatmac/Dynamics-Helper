import {
    ANALYSIS_PERSISTENCE_WARNING_ORDER,
    completeAnalyzePersistence,
    parseAnalyzePersistContextValue,
    recordAnalyzeStart,
    type AnalysisPersistenceWarning,
    type AnalyzeCompletion,
    type AnalyzePersistContext,
    type AnalyzePersistenceDeps,
} from '../utils/analysisStore'
import { normalizeErrorCode } from '../utils/promptSourceErrors'
import { safeErrorText } from '../utils/safeErrorText'
import {
    ownDataProperty,
    type OwnDataProperty,
} from '../utils/ownData'

export type AnalyzeForwardResponse =
    | {
          status: 'success'
          data: { markdown: string; saved_to?: string }
          extension_warnings?: AnalysisPersistenceWarning[]
      }
    | {
          status: 'error'
          error: string
          error_code?: string
          errorKind?: string
          httpStatus?: number
          extension_warnings?: AnalysisPersistenceWarning[]
      }

export interface AnalyzeNativePayload {
    text: string
    context: string
    timestamp: string
    rootPath: string
    product?: string
    caseNumber?: string
    rootPathOverrideProvided?: true
}

export interface AnalyzeNativeAction extends Record<string, unknown> {
    action: 'analyze_error'
    requestId: string
    payload: AnalyzeNativePayload
}

export interface AnalyzeForwardDeps {
    send: (forwarded: AnalyzeNativeAction) => Promise<unknown>
    persistence?: AnalyzePersistenceDeps
    recordStart?: (
        ctx: AnalyzePersistContext,
        now?: () => number,
    ) => Promise<void>
    completePersistence?: typeof completeAnalyzePersistence
}

export interface ParsedAnalyzeSuccess {
    markdown: string
    savedTo?: string
}

const ANALYZE_PAYLOAD_KEYS = new Set([
    'text', 'context', 'timestamp', 'rootPath',
    'product', 'caseNumber', 'rootPathOverrideProvided',
])

function malformedAnalyzeResponse(): AnalyzeForwardResponse {
    return {
        status: 'error',
        error_code: 'malformed_native_response',
        error: 'The Native Host returned a malformed Analyze response.',
    }
}

function invalidAnalyzeResponse(): AnalyzeForwardResponse {
    return {
        status: 'error',
        error_code: 'invalid_analyze_persistence_context',
        error: 'Analyze persistence context is invalid.',
    }
}

function invalidAnalyzeRequest(): {
    ok: false
    response: AnalyzeForwardResponse
} {
    return { ok: false, response: invalidAnalyzeResponse() }
}

function descriptorField(
    descriptors: object,
    key: string,
): OwnDataProperty {
    try {
        const holder = Reflect.getOwnPropertyDescriptor(descriptors, key)
        if (!holder) return { kind: 'absent' }
        if (!Object.hasOwn(holder, 'value')) return { kind: 'invalid' }
        const descriptor = holder.value as PropertyDescriptor
        return Object.hasOwn(descriptor, 'value')
            ? { kind: 'value', value: descriptor.value }
            : { kind: 'invalid' }
    } catch {
        return { kind: 'invalid' }
    }
}

function parseAnalyzePersistContextFromDescriptors(
    descriptors: object,
): AnalyzePersistContext | null {
    const requestId = descriptorField(descriptors, 'requestId')
    const persist = descriptorField(descriptors, '_persist')
    if (
        requestId.kind !== 'value'
        || typeof requestId.value !== 'string'
        || requestId.value.length === 0
        || persist.kind !== 'value'
    ) return null
    const caseNumber = ownDataProperty(persist.value, 'caseNumber')
    const successTitle = ownDataProperty(persist.value, 'successTitle')
    const errorTitle = ownDataProperty(persist.value, 'errorTitle')
    return parseAnalyzePersistContextValue({
        caseNumber: caseNumber.kind === 'value'
            ? caseNumber.value
            : undefined,
        requestId: requestId.value,
        successTitle: successTitle.kind === 'value'
            ? successTitle.value
            : undefined,
        errorTitle: errorTitle.kind === 'value'
            ? errorTitle.value
            : undefined,
    })
}

export function parseAnalyzePersistContext(
    value: unknown,
): AnalyzePersistContext | null {
    try {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return null
        }
        return parseAnalyzePersistContextFromDescriptors(
            Object.getOwnPropertyDescriptors(value),
        )
    } catch {
        return null
    }
}

function defineAnalyzeData(
    target: object,
    key: string,
    value: unknown,
): boolean {
    try {
        Object.defineProperty(target, key, {
            value,
            enumerable: true,
            writable: true,
            configurable: true,
        })
        return true
    } catch {
        return false
    }
}

function parseAnalyzeNativePayload(value: unknown): AnalyzeNativePayload | null {
    try {
        if (
            typeof value !== 'object'
            || value === null
            || Array.isArray(value)
            || Object.getPrototypeOf(value) !== Object.prototype
        ) return null
        const descriptors = Object.getOwnPropertyDescriptors(value)
        const keys = Reflect.ownKeys(descriptors)
        for (const key of keys) {
            if (typeof key !== 'string' || !ANALYZE_PAYLOAD_KEYS.has(key)) {
                return null
            }
            const holder = Reflect.getOwnPropertyDescriptor(descriptors, key)
            if (!holder || !Object.hasOwn(holder, 'value')) return null
            const field = descriptorField(descriptors, key)
            if (field.kind !== 'value') return null
        }
        const text = descriptorField(descriptors, 'text')
        const context = descriptorField(descriptors, 'context')
        const timestamp = descriptorField(descriptors, 'timestamp')
        const rootPath = descriptorField(descriptors, 'rootPath')
        if (
            text.kind !== 'value' || typeof text.value !== 'string'
            || context.kind !== 'value' || typeof context.value !== 'string'
            || timestamp.kind !== 'value' || typeof timestamp.value !== 'string'
            || rootPath.kind !== 'value' || typeof rootPath.value !== 'string'
        ) return null

        const product = descriptorField(descriptors, 'product')
        const caseNumber = descriptorField(descriptors, 'caseNumber')
        const override = descriptorField(
            descriptors,
            'rootPathOverrideProvided',
        )
        if (
            (product.kind !== 'absent'
                && (product.kind !== 'value'
                    || typeof product.value !== 'string'))
            || (caseNumber.kind !== 'absent'
                && (caseNumber.kind !== 'value'
                    || typeof caseNumber.value !== 'string'))
            || (override.kind !== 'absent'
                && (override.kind !== 'value' || override.value !== true))
        ) return null

        const payload: Record<string, unknown> = {}
        if (
            !defineAnalyzeData(payload, 'text', text.value)
            || !defineAnalyzeData(payload, 'context', context.value)
            || !defineAnalyzeData(payload, 'timestamp', timestamp.value)
            || !defineAnalyzeData(payload, 'rootPath', rootPath.value)
        ) return null
        if (
            product.kind === 'value'
            && !defineAnalyzeData(payload, 'product', product.value)
        ) return null
        if (
            caseNumber.kind === 'value'
            && !defineAnalyzeData(payload, 'caseNumber', caseNumber.value)
        ) return null
        if (
            override.kind === 'value'
            && !defineAnalyzeData(payload, 'rootPathOverrideProvided', true)
        ) return null
        Object.defineProperty(payload, 'toJSON', {
            value: undefined,
            enumerable: false,
            writable: false,
            configurable: false,
        })
        return Object.freeze(payload as unknown as AnalyzeNativePayload)
    } catch {
        return null
    }
}

export function parseAnalyzeForwardRequest(
    inner: unknown,
):
    | {
          ok: true
          forwarded: AnalyzeNativeAction
          context: AnalyzePersistContext
      }
    | { ok: false; response: AnalyzeForwardResponse } {
    try {
        if (
            typeof inner !== 'object'
            || inner === null
            || Array.isArray(inner)
            || Object.getPrototypeOf(inner) !== Object.prototype
        ) {
            return invalidAnalyzeRequest()
        }
        const descriptors = Object.getOwnPropertyDescriptors(inner)
        const context = parseAnalyzePersistContextFromDescriptors(descriptors)
        if (!context) return invalidAnalyzeRequest()
        const action = descriptorField(descriptors, 'action')
        const requestId = descriptorField(descriptors, 'requestId')
        const payloadField = descriptorField(descriptors, 'payload')
        if (
            action.kind !== 'value' || action.value !== 'analyze_error'
            || requestId.kind !== 'value'
            || typeof requestId.value !== 'string'
            || requestId.value.length === 0
            || payloadField.kind !== 'value'
        ) return invalidAnalyzeRequest()
        const payload = parseAnalyzeNativePayload(payloadField.value)
        if (!payload) return invalidAnalyzeRequest()
        const forwarded: Record<string, unknown> = {}
        if (
            !defineAnalyzeData(forwarded, 'action', 'analyze_error')
            || !defineAnalyzeData(forwarded, 'requestId', requestId.value)
            || !defineAnalyzeData(forwarded, 'payload', payload)
        ) return invalidAnalyzeRequest()
        return {
            ok: true,
            forwarded: Object.freeze(forwarded as AnalyzeNativeAction),
            context: Object.freeze(context),
        }
    } catch {
        return invalidAnalyzeRequest()
    }
}

export function isAnalyzePayload(payload: unknown): boolean {
    const action = ownDataProperty(payload, 'action')
    return action.kind === 'value' && action.value === 'analyze_error'
}

export function parseAnalyzeSuccess(value: unknown): ParsedAnalyzeSuccess | null {
    const markdown = ownDataProperty(value, 'markdown')
    const savedTo = ownDataProperty(value, 'saved_to')
    if (markdown.kind !== 'value' || typeof markdown.value !== 'string') {
        return null
    }
    if (
        savedTo.kind !== 'absent'
        && (savedTo.kind !== 'value' || typeof savedTo.value !== 'string')
    ) return null
    return {
        markdown: markdown.value,
        ...(savedTo.kind === 'value'
            ? { savedTo: savedTo.value as string }
            : {}),
    }
}

function normalizeAnalyzeError(value: unknown): AnalyzeForwardResponse | null {
    const error = ownDataProperty(value, 'error')
    const message = ownDataProperty(value, 'message')
    const errorCode = ownDataProperty(value, 'error_code')
    const errorKind = ownDataProperty(value, 'errorKind')
    const httpStatus = ownDataProperty(value, 'httpStatus')
    if (
        error.kind === 'invalid'
        || message.kind === 'invalid'
        || errorCode.kind === 'invalid'
        || errorKind.kind === 'invalid'
        || httpStatus.kind === 'invalid'
    ) return null
    const normalizedCode = normalizeErrorCode(
        errorCode.kind === 'value' ? errorCode.value : undefined,
    )
    const normalizedKind = errorKind.kind === 'value'
        && typeof errorKind.value === 'string'
        ? errorKind.value
        : undefined
    const normalizedStatus = httpStatus.kind === 'value'
        && typeof httpStatus.value === 'number'
        && Number.isFinite(httpStatus.value)
        ? httpStatus.value
        : undefined
    return {
        status: 'error',
        error: safeErrorText([
            error.kind === 'value' ? error.value : undefined,
            message.kind === 'value' ? message.value : undefined,
        ], 'Native Host error'),
        ...(normalizedCode ? { error_code: normalizedCode } : {}),
        ...(normalizedKind === undefined ? {} : { errorKind: normalizedKind }),
        ...(normalizedStatus === undefined ? {} : { httpStatus: normalizedStatus }),
    }
}

export function normalizeAnalyzeHostOutcome(value: unknown): AnalyzeForwardResponse {
    const outerStatus = ownDataProperty(value, 'status')
    if (outerStatus.kind !== 'value') return malformedAnalyzeResponse()
    if (outerStatus.value === 'error') {
        return normalizeAnalyzeError(value) ?? malformedAnalyzeResponse()
    }
    if (outerStatus.value !== 'success') return malformedAnalyzeResponse()

    const innerField = ownDataProperty(value, 'data')
    if (innerField.kind !== 'value') return malformedAnalyzeResponse()
    const innerStatus = ownDataProperty(innerField.value, 'status')
    if (innerStatus.kind !== 'value') return malformedAnalyzeResponse()
    if (innerStatus.value === 'error') {
        return normalizeAnalyzeError(innerField.value) ?? malformedAnalyzeResponse()
    }
    if (innerStatus.value !== 'success') return malformedAnalyzeResponse()

    const data = ownDataProperty(innerField.value, 'data')
    if (data.kind !== 'value') return malformedAnalyzeResponse()
    const parsed = parseAnalyzeSuccess(data.value)
    if (!parsed) return malformedAnalyzeResponse()
    return {
        status: 'success',
        data: {
            markdown: parsed.markdown,
            ...(parsed.savedTo === undefined ? {} : { saved_to: parsed.savedTo }),
        },
    }
}

function parseWarningArray(value: unknown): AnalysisPersistenceWarning[] | null {
    try {
        if (!Array.isArray(value)) return null
        const indexKeys = ['0', '1'] as const
        const descriptors = Object.getOwnPropertyDescriptors(value)
        const length = descriptorField(descriptors, 'length')
        if (
            length.kind !== 'value'
            || typeof length.value !== 'number'
            || !Number.isInteger(length.value)
            || length.value < 0
            || length.value > ANALYSIS_PERSISTENCE_WARNING_ORDER.length
            || length.value > indexKeys.length
        ) return null
        const expectedKeys = new Set<string>(['length'])
        for (let index = 0; index < length.value; index += 1) {
            const key = indexKeys[index]
            if (key === undefined) return null
            expectedKeys.add(key)
        }
        for (const key of Reflect.ownKeys(descriptors)) {
            if (typeof key !== 'string' || !expectedKeys.has(key)) return null
        }
        const warnings: AnalysisPersistenceWarning[] = []
        let previousOrder = -1
        for (let index = 0; index < length.value; index += 1) {
            const key = indexKeys[index]
            if (key === undefined) return null
            const field = descriptorField(descriptors, key)
            if (field.kind !== 'value') return null
            const order = ANALYSIS_PERSISTENCE_WARNING_ORDER.indexOf(
                field.value as AnalysisPersistenceWarning,
            )
            if (order < 0 || order <= previousOrder) return null
            previousOrder = order
            warnings.push(ANALYSIS_PERSISTENCE_WARNING_ORDER[order])
        }
        return warnings
    } catch {
        return null
    }
}

function parseWarnings(
    value: unknown,
): { valid: true; warnings: AnalysisPersistenceWarning[] } | { valid: false } {
    const field = ownDataProperty(value, 'extension_warnings')
    if (field.kind === 'absent') return { valid: true, warnings: [] }
    if (field.kind !== 'value') return { valid: false }
    const warnings = parseWarningArray(field.value)
    return warnings ? { valid: true, warnings } : { valid: false }
}

export function parseAnalyzeForwardResult(value: unknown): AnalyzeForwardResponse {
    const status = ownDataProperty(value, 'status')
    const parsedWarnings = parseWarnings(value)
    if (status.kind !== 'value' || !parsedWarnings.valid) {
        return malformedAnalyzeResponse()
    }
    const warningField = parsedWarnings.warnings.length > 0
        ? { extension_warnings: parsedWarnings.warnings }
        : {}
    if (status.value === 'success') {
        const data = ownDataProperty(value, 'data')
        if (data.kind !== 'value') return malformedAnalyzeResponse()
        const parsed = parseAnalyzeSuccess(data.value)
        if (!parsed) return malformedAnalyzeResponse()
        return {
            status: 'success',
            data: {
                markdown: parsed.markdown,
                ...(parsed.savedTo === undefined ? {} : { saved_to: parsed.savedTo }),
            },
            ...warningField,
        }
    }
    if (status.value !== 'error') return malformedAnalyzeResponse()
    const error = ownDataProperty(value, 'error')
    const errorCode = ownDataProperty(value, 'error_code')
    const errorKind = ownDataProperty(value, 'errorKind')
    const httpStatus = ownDataProperty(value, 'httpStatus')
    if (
        error.kind !== 'value' || typeof error.value !== 'string'
        || (errorCode.kind !== 'absent'
            && (errorCode.kind !== 'value'
                || normalizeErrorCode(errorCode.value) === undefined))
        || (errorKind.kind !== 'absent'
            && (errorKind.kind !== 'value'
                || typeof errorKind.value !== 'string'))
        || (httpStatus.kind !== 'absent'
            && (httpStatus.kind !== 'value'
                || typeof httpStatus.value !== 'number'
                || !Number.isFinite(httpStatus.value)))
    ) return malformedAnalyzeResponse()
    return {
        status: 'error',
        error: error.value,
        ...(errorCode.kind === 'value' ? { error_code: errorCode.value as string } : {}),
        ...(errorKind.kind === 'value' ? { errorKind: errorKind.value as string } : {}),
        ...(httpStatus.kind === 'value' ? { httpStatus: httpStatus.value as number } : {}),
        ...warningField,
    }
}

function rejectionMessage(value: unknown): unknown {
    const message = ownDataProperty(value, 'message')
    return message.kind === 'value' ? message.value : undefined
}

export async function handleAnalyzeForward(
    forwarded: AnalyzeNativeAction,
    context: AnalyzePersistContext,
    deps: AnalyzeForwardDeps,
): Promise<AnalyzeForwardResponse> {
    const parsedContext = parseAnalyzePersistContextValue(context)
    if (!parsedContext) return invalidAnalyzeResponse()
    const safeContext = Object.freeze(parsedContext)

    const recordStart = deps.recordStart ?? recordAnalyzeStart
    const persistenceNow = deps.persistence ? deps.persistence.now : undefined
    try {
        await recordStart(safeContext, persistenceNow)
    } catch {
        return {
            status: 'error',
            error_code: 'analysis_persistence_start_failed',
            error: 'Analyze persistence could not be started.',
        }
    }

    let normalized: AnalyzeForwardResponse
    try {
        normalized = normalizeAnalyzeHostOutcome(await deps.send(forwarded))
    } catch (error) {
        normalized = {
            status: 'error',
            error: safeErrorText(
                [rejectionMessage(error)],
                'Native Host error',
            ),
        }
    }

    const completion: AnalyzeCompletion = normalized.status === 'success'
        ? {
              status: 'success',
              markdown: normalized.data.markdown,
              ...(normalized.data.saved_to === undefined
                  ? {}
                  : { savedTo: normalized.data.saved_to }),
          }
        : {
              status: 'error',
              error: normalized.error,
              ...(normalized.error_code === undefined
                  ? {}
                  : { errorCode: normalized.error_code }),
          }
    const completePersistence = deps.completePersistence
        ?? completeAnalyzePersistence
    let warnings: AnalysisPersistenceWarning[]
    try {
        const observed = await completePersistence(
            safeContext,
            completion,
            deps.persistence,
        )
        const warningSet = new Set(observed)
        warnings = ANALYSIS_PERSISTENCE_WARNING_ORDER.filter(warning => (
            warningSet.has(warning)
        ))
    } catch {
        console.warn('[DH] Analyze completion persistence failed')
        warnings = [...ANALYSIS_PERSISTENCE_WARNING_ORDER]
    }
    return {
        ...normalized,
        ...(warnings.length > 0 ? { extension_warnings: warnings } : {}),
    }
}

export function normalizeNativeHostResponse(msg: unknown): unknown {
    const status = ownDataProperty(msg, 'status')
    if (status.kind === 'value' && status.value === 'success') {
        const data = ownDataProperty(msg, 'data')
        return {
            status: 'success',
            data: data.kind === 'value' ? data.value : undefined,
        }
    }
    const normalized = normalizeAnalyzeError(msg)
    return normalized ?? { status: 'error', error: 'Native Host error' }
}

export function summarizeNativeHostMessage(msg: unknown): {
    requestId?: string
    status?: string
    action?: string
    errorCode?: string
} {
    const requestId = ownDataProperty(msg, 'requestId')
    const status = ownDataProperty(msg, 'status')
    const action = ownDataProperty(msg, 'action')
    const outerCode = ownDataProperty(msg, 'error_code')
    const data = ownDataProperty(msg, 'data')
    const innerCode = data.kind === 'value'
        ? ownDataProperty(data.value, 'error_code')
        : { kind: 'absent' } as const
    return {
        requestId: requestId.kind === 'value' && typeof requestId.value === 'string'
            ? requestId.value
            : undefined,
        status: status.kind === 'value' && typeof status.value === 'string'
            ? status.value
            : undefined,
        action: action.kind === 'value' && typeof action.value === 'string'
            ? action.value
            : undefined,
        errorCode: normalizeErrorCode(
            outerCode.kind === 'value'
                ? outerCode.value
                : innerCode.kind === 'value'
                    ? innerCode.value
                    : undefined,
        ),
    }
}
