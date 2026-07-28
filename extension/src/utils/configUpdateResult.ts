import { normalizeErrorCode } from './promptSourceErrors'
import { safeErrorText } from './safeErrorText'
import { ownDataProperty } from './ownData'

export interface ConfigUpdateIssue {
  configSaved: boolean
  errorCode?: string
  fallback?: string
}

export interface ConfigUpdateDecision {
  acknowledged: boolean
  issue: ConfigUpdateIssue | null
}

export interface InstructionUpdateToken {
  revision: number
  value: string
}

export interface PromptUpdateToken {
  revision: number
  value: string
}

export interface ConfigUpdateIntent<T extends object> {
  generation: number
  prefs: Readonly<T>
  instruction?: Readonly<InstructionUpdateToken>
  prompt?: Readonly<PromptUpdateToken>
}

export function createConfigUpdateIntent<T extends object>(
  generation: number,
  prefs: T,
  instruction?: InstructionUpdateToken,
  prompt?: PromptUpdateToken,
): ConfigUpdateIntent<T> {
  return Object.freeze({
    generation,
    prefs: Object.freeze({ ...prefs }),
    instruction: instruction
      ? Object.freeze({ ...instruction })
      : undefined,
    prompt: prompt
      ? Object.freeze({ ...prompt })
      : undefined,
  })
}

export function shouldIncludeUserInstructions(
  editRevision: number,
  acknowledgedRevision: number,
): boolean {
  return editRevision > acknowledgedRevision
}

export function acknowledgeInstructionRevision(
  acknowledgedRevision: number,
  sentRevision: number,
  acknowledged: boolean,
): number {
  return acknowledged
    ? Math.max(acknowledgedRevision, sentRevision)
    : acknowledgedRevision
}

export function shouldIncludeUserPrompt(
  editRevision: number,
  acknowledgedRevision: number,
): boolean {
  return editRevision > acknowledgedRevision
}

export function acknowledgePromptRevision(
  acknowledgedRevision: number,
  sentRevision: number,
  acknowledged: boolean,
): number {
  return acknowledged
    ? Math.max(acknowledgedRevision, sentRevision)
    : acknowledgedRevision
}

export function classifyConfigUpdateResponse(
  response: unknown,
): ConfigUpdateDecision {
  const fixedFailure: ConfigUpdateDecision = {
    acknowledged: false,
    issue: { configSaved: false },
  }
  const status = ownDataProperty(response, 'status')
  if (status.kind !== 'value') return fixedFailure

  const issueFrom = (
    value: unknown,
    configSaved: boolean,
  ): ConfigUpdateIssue => {
    const errorCode = ownDataProperty(value, 'error_code')
    const error = ownDataProperty(value, 'error')
    const message = ownDataProperty(value, 'message')
    return {
      configSaved,
      errorCode: normalizeErrorCode(
        errorCode.kind === 'value' ? errorCode.value : undefined,
      ),
      fallback: safeErrorText([
        error.kind === 'value' ? error.value : undefined,
        message.kind === 'value' ? message.value : undefined,
      ], ''),
    }
  }

  if (status.value !== 'success') {
    if (status.value !== 'error') return fixedFailure
    return {
      acknowledged: false,
      issue: issueFrom(response, false),
    }
  }

  const data = ownDataProperty(response, 'data')
  if (data.kind !== 'value') return fixedFailure
  const success = ownDataProperty(data.value, 'success')
  const configSaved = ownDataProperty(data.value, 'config_saved')
  if (success.kind === 'invalid' || configSaved.kind === 'invalid') {
    return fixedFailure
  }
  if (
    configSaved.kind === 'value'
    && typeof configSaved.value !== 'boolean'
  ) {
    return {
      acknowledged: false,
      issue: issueFrom(data.value, false),
    }
  }
  if (
    success.kind === 'value'
    && success.value === true
    && (
      configSaved.kind === 'absent'
      || configSaved.value === true
    )
  ) {
    return { acknowledged: true, issue: null }
  }
  if (success.kind === 'value' && success.value === true) {
    return {
      acknowledged: false,
      issue: issueFrom(data.value, false),
    }
  }
  if (success.kind === 'value' && success.value === false) {
    const saved = configSaved.kind === 'value' && configSaved.value === true
    return {
      acknowledged: saved,
      issue: issueFrom(data.value, saved),
    }
  }
  return {
    acknowledged: false,
    issue: issueFrom(data.value, false),
  }
}
