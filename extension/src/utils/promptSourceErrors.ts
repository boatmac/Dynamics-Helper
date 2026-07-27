export type KnownPromptSourceErrorCode =
    | 'dh_core_prompt_missing'
    | 'dh_core_prompt_unreadable'
    | 'dh_specific_instructions_unreadable'
    | 'repository_instructions_missing'
    | 'repository_instructions_unreadable'
    | 'user_prompt_unreadable'

export type Translate = (key: string) => string

const TRANSLATION_KEYS: Record<KnownPromptSourceErrorCode, string> = {
    dh_core_prompt_missing: 'promptErrorDhCoreMissing',
    dh_core_prompt_unreadable: 'promptErrorDhCoreUnreadable',
    dh_specific_instructions_unreadable: 'promptErrorDhSpecificUnreadable',
    repository_instructions_missing: 'promptErrorRepositoryMissing',
    repository_instructions_unreadable: 'promptErrorRepositoryUnreadable',
    user_prompt_unreadable: 'promptErrorUserPromptUnreadable',
}

const ANALYZE_ERROR_TRANSLATION_KEYS: Record<string, string> = {
    malformed_native_response: 'analysisMalformedResponse',
    invalid_analyze_persistence_context: 'analysisPersistenceContextInvalid',
    analysis_persistence_start_failed: 'analysisPersistenceStartFailed',
}

export function normalizeErrorCode(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined
}

export function localizePromptSourceError(
    errorCode: unknown,
    fallback: string,
    t: Translate,
): string {
    const normalized = normalizeErrorCode(errorCode)
    if (normalized && Object.hasOwn(TRANSLATION_KEYS, normalized)) {
        return t(TRANSLATION_KEYS[normalized as KnownPromptSourceErrorCode])
    }
    return fallback
}

export function localizeAnalyzeError(
    errorCode: unknown,
    fallback: string,
    t: (key: string) => string,
): string {
    const normalized = normalizeErrorCode(errorCode)
    if (
        normalized
        && Object.hasOwn(ANALYZE_ERROR_TRANSLATION_KEYS, normalized)
    ) {
        return t(ANALYZE_ERROR_TRANSLATION_KEYS[normalized])
    }
    return localizePromptSourceError(normalized, fallback, t)
}
