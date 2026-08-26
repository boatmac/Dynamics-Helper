const USER_PROMPT_HEADING = /^## User Prompt[\t ]*\r?$/m

export function applyCurrentUserPrompt(
    context: string,
    currentPrompt: string | undefined,
): string {
    const markerIndex = context.search(USER_PROMPT_HEADING)

    if (markerIndex < 0 && !currentPrompt?.trim()) return context

    const withoutPriorPrompt = (
        markerIndex >= 0 ? context.slice(0, markerIndex) : context
    ).trimEnd()
    if (!currentPrompt?.trim()) return withoutPriorPrompt

    return `${withoutPriorPrompt}\n\n## User Prompt\n\n${currentPrompt}`
}
