import type { ScrapedData } from './pageReader'

const USER_PROMPT_HEADING = /^## User Prompt[\t ]*\r?$/m

export function formatIrSlaSnapshot(
    data: Pick<ScrapedData, 'irSlaStatus' | 'irSlaCapturedAt'>,
): string {
    return [
        '## IR SLA Snapshot',
        '',
        `Status: ${data.irSlaStatus === 'Succeeded' ? 'Succeeded' : 'Unknown'}`,
        `Captured at (UTC): ${data.irSlaCapturedAt || 'unavailable'}`,
        'Countdown: unknown',
        'Deadline (UTC): unknown',
        '',
        'Captured observation, not a live timer or execution budget.',
    ].join('\n')
}

export function applyIrSlaSnapshot(
    context: string,
    snapshot: Pick<ScrapedData, 'irSlaStatus' | 'irSlaCapturedAt'>,
): string {
    let fence = ''
    let sectionStart = -1
    let cursor = 0
    let promptStart = context.length
    const parts: string[] = []

    // Only the exact, unfenced product heading owns an IR section.
    // This helper's fence handling does not change applyCurrentUserPrompt's canonical boundary.
    for (const match of context.matchAll(/[^\n]*(?:\n|$)/g)) {
        const line = match[0].replace(/\r?\n$/, '')
        const offset = match.index!
        const fenceMatch = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line)
        if (fence) {
            if (fenceMatch && fenceMatch[1][0] === fence[0]
                && fenceMatch[1].length >= fence.length && !fenceMatch[2].trim()) {
                fence = ''
            }
            continue
        }
        if (fenceMatch && (fenceMatch[1][0] !== '`' || !fenceMatch[2].includes('`'))) {
            fence = fenceMatch[1]
            continue
        }
        if (!/^ {0,3}#{1,2}(?:[\t ]|$)/.test(line)) continue
        if (sectionStart >= 0) {
            parts.push(context.slice(cursor, sectionStart))
            cursor = offset
            sectionStart = -1
        }
        if (/^## User Prompt[\t ]*$/.test(line)) {
            promptStart = offset
            break
        }
        if (/^## IR SLA Snapshot[\t ]*$/.test(line)) sectionStart = offset
    }
    parts.push(context.slice(cursor, sectionStart >= 0 ? sectionStart : promptStart))
    const body = parts.join('').trimEnd()
    const result = `${body ? `${body}\n\n` : ''}${formatIrSlaSnapshot(snapshot)}`
    return promptStart < context.length
        ? `${result}\n\n${context.slice(promptStart)}`
        : result
}

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
