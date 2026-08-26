export function safeErrorText(
    candidates: readonly unknown[],
    fallback: string,
): string {
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.length > 0) {
            return candidate
        }
    }
    return fallback
}
