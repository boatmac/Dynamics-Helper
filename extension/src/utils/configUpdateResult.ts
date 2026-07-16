import { normalizeErrorCode } from './promptSourceErrors'

export interface ConfigUpdateIssue {
  configSaved: boolean
  errorCode?: string
  fallback?: string
}

export interface ConfigUpdateDecision {
  acknowledged: boolean
  issue: ConfigUpdateIssue | null
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

export function classifyConfigUpdateResponse(
  response: any,
): ConfigUpdateDecision {
  if (response?.status !== 'success') {
    return {
      acknowledged: false,
      issue: {
        configSaved: false,
        errorCode: normalizeErrorCode(response?.error_code),
        fallback: String(response?.error || response?.message || ''),
      },
    }
  }

  const result = response.data
  if (result?.success === true) {
    return { acknowledged: true, issue: null }
  }
  if (result?.success === false || result?.error) {
    const configSaved = result?.config_saved === true
    return {
      acknowledged: configSaved,
      issue: {
        configSaved,
        errorCode: normalizeErrorCode(result?.error_code),
        fallback: String(result?.error || ''),
      },
    }
  }
  return {
    acknowledged: false,
    issue: { configSaved: false },
  }
}
