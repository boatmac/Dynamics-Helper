import { describe, expect, it, vi } from 'vitest'
import {
  acknowledgePromptRevision,
  acknowledgeInstructionRevision,
  classifyConfigUpdateResponse,
  createConfigUpdateIntent,
  shouldIncludeUserPrompt,
  shouldIncludeUserInstructions,
} from './configUpdateResult'

describe('config update results', () => {
  const innerIssue = (
    configSaved: boolean,
    fallback = '',
    errorCode?: string,
  ) => ({
    configSaved,
    errorCode,
    fallback,
  })

  it.each([
    {
      result: { success: true },
      expected: { acknowledged: true, issue: null },
    },
    {
      result: { success: true, config_saved: true },
      expected: { acknowledged: true, issue: null },
    },
    {
      result: {
        success: true,
        config_saved: false,
        error: 'contradictory response',
      },
      expected: {
        acknowledged: false,
        issue: innerIssue(false, 'contradictory response'),
      },
    },
    {
      result: {
        success: false,
        config_saved: true,
        error_code: 'repository_instructions_missing',
        error: 'safe fallback',
      },
      expected: {
        acknowledged: true,
        issue: innerIssue(
          true,
          'safe fallback',
          'repository_instructions_missing',
        ),
      },
    },
    {
      result: { success: false },
      expected: {
        acknowledged: false,
        issue: innerIssue(false),
      },
    },
    {
      result: { success: false, config_saved: false },
      expected: {
        acknowledged: false,
        issue: innerIssue(false),
      },
    },
    {
      result: {},
      expected: {
        acknowledged: false,
        issue: innerIssue(false),
      },
    },
    {
      result: { config_saved: true },
      expected: {
        acknowledged: false,
        issue: innerIssue(false),
      },
    },
    {
      result: { config_saved: false },
      expected: {
        acknowledged: false,
        issue: innerIssue(false),
      },
    },
    {
      result: { success: 'true' },
      expected: {
        acknowledged: false,
        issue: innerIssue(false),
      },
    },
    {
      result: { success: 1, config_saved: true },
      expected: {
        acknowledged: false,
        issue: innerIssue(false),
      },
    },
  ])('classifies the config_saved property-presence matrix', ({
    result,
    expected,
  }) => {
    expect(classifyConfigUpdateResponse({
      status: 'success',
      data: result,
    })).toEqual(expected)
  })

  it('acknowledges the legacy Host response without config_saved', () => {
    expect(classifyConfigUpdateResponse({
      status: 'success',
      data: { success: true },
    })).toEqual({ acknowledged: true, issue: null })
  })

  it('rejects present null config_saved', () => {
    expect(classifyConfigUpdateResponse({
      status: 'success',
      data: { success: true, config_saved: null },
    })).toEqual({
      acknowledged: false,
      issue: innerIssue(false),
    })
  })

  it.each(['true', 1, 0, [], {}, Symbol('x')])(
    'rejects present malformed config_saved',
    configSaved => {
      expect(classifyConfigUpdateResponse({
        status: 'success',
        data: { success: true, config_saved: configSaved },
      })).toEqual({
        acknowledged: false,
        issue: innerIssue(false),
      })
    },
  )

  it.each([
    [{ error: 'safe error', message: 'safe message' }, 'safe error'],
    [{ error: { secret: true }, message: 'safe message' }, 'safe message'],
    [{ error: { secret: true }, message: [] }, ''],
  ])('uses safe contradictory response fallback precedence', (
    fields,
    fallback,
  ) => {
    expect(classifyConfigUpdateResponse({
      status: 'success',
      data: {
        success: true,
        config_saved: false,
        ...fields,
      },
    })).toEqual({
      acknowledged: false,
      issue: innerIssue(false, fallback),
    })
  })

  it('contains invalid config_saved descriptors without conversion or logging', () => {
    const secret = 'SECRET-CONFIG-SAVED-DESCRIPTOR'
    const getter = vi.fn(() => secret)
    const toString = vi.fn(() => secret)
    const accessorResult = { success: true, toString }
    Object.defineProperty(accessorResult, 'config_saved', {
      enumerable: true,
      get: getter,
    })
    const descriptor = vi.fn((target: object, key: PropertyKey) => {
      if (key === 'config_saved') throw new Error(secret)
      return Reflect.getOwnPropertyDescriptor(target, key)
    })
    const proxyResult = new Proxy({ success: true, toString }, {
      getOwnPropertyDescriptor: descriptor,
    })
    const consoleSpies = [
      vi.spyOn(console, 'log').mockImplementation(() => undefined),
      vi.spyOn(console, 'info').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined),
      vi.spyOn(console, 'error').mockImplementation(() => undefined),
      vi.spyOn(console, 'debug').mockImplementation(() => undefined),
    ]

    try {
      for (const result of [accessorResult, proxyResult]) {
        expect(() => classifyConfigUpdateResponse({
          status: 'success',
          data: result,
        })).not.toThrow()
        expect(classifyConfigUpdateResponse({
          status: 'success',
          data: result,
        })).toEqual({
          acknowledged: false,
          issue: { configSaved: false },
        })
      }
      expect(getter).not.toHaveBeenCalled()
      expect(toString).not.toHaveBeenCalled()
      expect(consoleSpies.every(spy => spy.mock.calls.length === 0)).toBe(true)
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('contains malformed outer status and data without inspecting raw errors', () => {
    const secret = 'SECRET-OUTER-CONFIG-RESPONSE'
    const getter = vi.fn(() => secret)
    const toString = vi.fn(() => secret)
    const statusAccessor = { error: { secret, toString } }
    Object.defineProperty(statusAccessor, 'status', {
      enumerable: true,
      get: getter,
    })
    const dataAccessor = { status: 'success', error: { secret, toString } }
    Object.defineProperty(dataAccessor, 'data', {
      enumerable: true,
      get: getter,
    })
    const statusTrap = new Proxy({ error: { secret, toString } }, {
      getOwnPropertyDescriptor: () => {
        throw new Error(secret)
      },
    })
    const consoleSpies = [
      vi.spyOn(console, 'log').mockImplementation(() => undefined),
      vi.spyOn(console, 'info').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined),
      vi.spyOn(console, 'error').mockImplementation(() => undefined),
      vi.spyOn(console, 'debug').mockImplementation(() => undefined),
    ]

    try {
      for (const response of [statusAccessor, dataAccessor, statusTrap]) {
        expect(() => classifyConfigUpdateResponse(response)).not.toThrow()
        expect(classifyConfigUpdateResponse(response)).toEqual({
          acknowledged: false,
          issue: { configSaved: false },
        })
      }
      expect(getter).not.toHaveBeenCalled()
      expect(toString).not.toHaveBeenCalled()
      expect(consoleSpies.every(spy => spy.mock.calls.length === 0)).toBe(true)
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('contains revoked outer and nested config responses', () => {
    const outer = Proxy.revocable({ status: 'success' }, {})
    const nested = Proxy.revocable({ success: true }, {})
    outer.revoke()
    nested.revoke()

    for (const response of [outer.proxy, {
      status: 'success',
      data: nested.proxy,
    }]) {
      expect(() => classifyConfigUpdateResponse(response)).not.toThrow()
      expect(classifyConfigUpdateResponse(response)).toEqual({
        acknowledged: false,
        issue: { configSaved: false },
      })
    }
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

  it('does not coerce malformed inner or outer update errors', () => {
    const secret = 'SECRET-CONFIG-UPDATE'
    const toString = vi.fn(() => {
      throw new Error(secret)
    })
    const unsafe = { secret, toString }

    expect(classifyConfigUpdateResponse({
      status: 'success',
      data: {
        success: false,
        config_saved: false,
        error: unsafe,
        message: [unsafe],
      },
    })).toEqual({
      acknowledged: false,
      issue: {
        configSaved: false,
        errorCode: undefined,
        fallback: '',
      },
    })
    expect(classifyConfigUpdateResponse({
      status: 'error',
      error: unsafe,
      message: [unsafe],
    })).toEqual({
      acknowledged: false,
      issue: {
        configSaved: false,
        errorCode: undefined,
        fallback: '',
      },
    })
    expect(toString).not.toHaveBeenCalled()
  })

  it('preserves valid inner and outer string message fallbacks', () => {
    expect(classifyConfigUpdateResponse({
      status: 'success',
      data: {
        success: false,
        config_saved: false,
        error: { unsafe: true },
        message: 'safe inner message',
      },
    }).issue?.fallback).toBe('safe inner message')
    expect(classifyConfigUpdateResponse({
      status: 'error',
      error: [],
      message: 'safe outer message',
    }).issue?.fallback).toBe('safe outer message')
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
