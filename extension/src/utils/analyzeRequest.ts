import { ownDataProperty } from './ownData'
import {
    parsePageIdentitySnapshot,
    type PageIdentity,
} from './pageIdentity'

export interface AnalyzeInvocation {
    readonly rootPathOverride: string
}

export interface AnalyzeRequestSnapshot {
    readonly requestId: string
    readonly pageIdentity: PageIdentity | null
    readonly caseNumber: string
    readonly rootPath: string
    readonly rootPathOverrideProvided: boolean
}

export interface ContextMenuAnalyzePayload {
    selectionText?: string
    rootPath?: string
}

export function buildContextMenuAnalyzePayload(
    selectionText: unknown,
    storedPreferences: unknown,
): ContextMenuAnalyzePayload {
    const payload: ContextMenuAnalyzePayload = {}
    if (typeof selectionText === 'string') payload.selectionText = selectionText
    const root = ownDataProperty(storedPreferences, 'rootPath')
    if (root.kind === 'value' && typeof root.value === 'string') {
        payload.rootPath = root.value
    }
    return payload
}

export function readAnalyzeInvocation(detail: unknown): AnalyzeInvocation | undefined {
    const root = ownDataProperty(detail, 'rootPath')
    return root.kind === 'value' && typeof root.value === 'string'
        ? { rootPathOverride: root.value }
        : undefined
}

export function snapshotAnalyzeRequest(
    requestId: unknown,
    pageData: unknown,
    preferenceRoot: unknown,
    invocation?: unknown,
): AnalyzeRequestSnapshot {
    const page = parsePageIdentitySnapshot(pageData)
    if (!page || typeof requestId !== 'string' || requestId.length === 0) {
        throw new Error('Invalid Analyze request snapshot')
    }
    const override = ownDataProperty(invocation, 'rootPathOverride')
    const rootPathOverrideProvided = override.kind === 'value'
        && typeof override.value === 'string'
    const safePreferenceRoot = typeof preferenceRoot === 'string'
        ? preferenceRoot
        : ''
    const rootPath = rootPathOverrideProvided
        ? override.value as string
        : safePreferenceRoot
    return Object.freeze({
        requestId,
        pageIdentity: page.identity,
        caseNumber: page.caseNumber,
        rootPath,
        rootPathOverrideProvided,
    })
}

export function requestMatchesPage(
    request: AnalyzeRequestSnapshot,
    current: PageIdentity | null,
): boolean {
    return request.pageIdentity !== null && request.pageIdentity === current
}
