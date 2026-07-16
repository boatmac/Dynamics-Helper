const USER_PROMPT_HEADING = /^## User Prompt[\t ]*\r?$/gm

export function applyCurrentUserPrompt(
    context: string,
    currentPrompt: string | undefined,
): string {
    let markerIndex = -1
    for (const match of context.matchAll(USER_PROMPT_HEADING)) {
        markerIndex = match.index
    }

    if (markerIndex < 0 && !currentPrompt?.trim()) return context

    const withoutPriorPrompt = (
        markerIndex >= 0 ? context.slice(0, markerIndex) : context
    ).trimEnd()
    if (!currentPrompt?.trim()) return withoutPriorPrompt

    return `${withoutPriorPrompt}\n\n## User Prompt\n\n${currentPrompt}`
}
