import { describe, expect, it } from 'vitest'
import {
  acknowledgePromptRevision,
  acknowledgeInstructionRevision,
  classifyConfigUpdateResponse,
  createConfigUpdateIntent,
  shouldIncludeUserPrompt,
  shouldIncludeUserInstructions,
} from './configUpdateResult'

describe('config update results', () => {
  it('classifies inner success as acknowledged', () => {
    expect(classifyConfigUpdateResponse({
      status: 'success',
      data: { success: true, config_saved: true },
    })).toEqual({ acknowledged: true, issue: null })
  })

  it('classifies saved refresh failure and preserves code', () => {
    expect(classifyConfigUpdateResponse({
      status: 'success',
      data: {
        success: false,
        config_saved: true,
        error_code: 'repository_instructions_missing',
        error: 'safe fallback',
      },
    })).toEqual({
      acknowledged: true,
      issue: {
        configSaved: true,
        errorCode: 'repository_instructions_missing',
        fallback: 'safe fallback',
      },
    })
  })

  it('classifies outer error as not saved', () => {
    expect(classifyConfigUpdateResponse({
      status: 'error',
      error_code: 'future_code',
      error: 'transport fallback',
    })).toEqual({
      acknowledged: false,
      issue: {
        configSaved: false,
        errorCode: 'future_code',
        fallback: 'transport fallback',
      },
    })
  })

  it('classifies an inner unsaved failure as not acknowledged', () => {
    expect(classifyConfigUpdateResponse({
      status: 'success',
      data: {
        success: false,
        config_saved: false,
        error: 'write failed',
      },
    })).toEqual({
      acknowledged: false,
      issue: {
        configSaved: false,
        errorCode: undefined,
        fallback: 'write failed',
      },
    })
  })

  it('does not let an older response acknowledge a newer edit', () => {
    let editRevision = 1
    let ackRevision = 0
    const sentRevision = editRevision
    editRevision = 2
    ackRevision = acknowledgeInstructionRevision(
      ackRevision,
      sentRevision,
      true,
    )
    expect(ackRevision).toBe(1)
    expect(shouldIncludeUserInstructions(editRevision, ackRevision)).toBe(true)
  })

  it('does not acknowledge transport or unsaved failures', () => {
    expect(acknowledgeInstructionRevision(0, 1, false)).toBe(0)
  })

  it('captures an immutable prefs snapshot and instruction value', () => {
    const prefs = {
      userInstructions: 'revision-1',
      language: 'en',
    }
    const intent = createConfigUpdateIntent(1, prefs, {
      revision: 1,
      value: prefs.userInstructions,
    })

    prefs.userInstructions = 'revision-2'
    prefs.language = 'zh'

    expect(intent).toEqual({
      generation: 1,
      prefs: {
        userInstructions: 'revision-1',
        language: 'en',
      },
      instruction: { revision: 1, value: 'revision-1' },
    })
    expect(Object.isFrozen(intent)).toBe(true)
    expect(Object.isFrozen(intent.prefs)).toBe(true)
    expect(Object.isFrozen(intent.instruction)).toBe(true)
  })

  it('captures an immutable Custom User Prompt revision and value', () => {
    const prefs = { userPrompt: 'prompt-1', language: 'en' }
    const prompt = { revision: 1, value: prefs.userPrompt }

    const intent = createConfigUpdateIntent(1, prefs, undefined, prompt)
    prefs.userPrompt = 'prompt-2'
    prompt.value = 'prompt-2'

    expect(intent.prompt).toEqual({ revision: 1, value: 'prompt-1' })
    expect(Object.isFrozen(intent.prompt)).toBe(true)
  })

  it('does not let an older response acknowledge a newer prompt edit', () => {
    let acknowledgedRevision = 0
    acknowledgedRevision = acknowledgePromptRevision(
      acknowledgedRevision,
      1,
      true,
    )

    expect(acknowledgedRevision).toBe(1)
    expect(shouldIncludeUserPrompt(2, acknowledgedRevision)).toBe(true)
    expect(acknowledgePromptRevision(1, 2, false)).toBe(1)
  })
})
