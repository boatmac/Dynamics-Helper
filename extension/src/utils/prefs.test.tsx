import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  chromeMockSpies,
  deferNextStorageGet,
  emitStorageChanges,
  installChromeMock,
  resetChromeMock,
  seedStorage,
} from '../test/chromeMock'
import { DEFAULT_PREFS, usePrefs } from './prefs'

installChromeMock()

describe('usePrefs initial storage ordering', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
  })

  it('keeps a newer empty/default prefs change when the initial get resolves stale', async () => {
    const stale = {
      ...DEFAULT_PREFS,
      userPrompt: 'STALE PROMPT',
      language: 'zh' as const,
    }
    seedStorage({ dh_prefs: stale })
    const initialGet = deferNextStorageGet('dh_prefs')

    const { result } = renderHook(() => usePrefs())
    await waitFor(() => expect(chromeMockSpies.storageGet).toHaveBeenCalled())

    const current = {
      ...DEFAULT_PREFS,
      userPrompt: '',
      language: 'auto' as const,
    }
    act(() => {
      emitStorageChanges({
        dh_prefs: { oldValue: stale, newValue: current },
      })
    })
    expect(result.current.prefs.userPrompt).toBe('')
    expect(result.current.prefs.language).toBe('auto')

    await act(async () => initialGet.resolve(undefined))

    expect(result.current.prefs.userPrompt).toBe('')
    expect(result.current.prefs.language).toBe('auto')
  })

  it('registers the change listener before starting the initial get', async () => {
    deferNextStorageGet('dh_prefs')

    renderHook(() => usePrefs())
    await waitFor(() => expect(chromeMockSpies.storageGet).toHaveBeenCalled())

    expect(
      chromeMockSpies.storageOnChangedAddListener.mock.invocationCallOrder[0],
    ).toBeLessThan(chromeMockSpies.storageGet.mock.invocationCallOrder[0])
  })

  it('keeps defaults when Reset removes prefs before the stale initial get resolves', async () => {
    const stale = {
      ...DEFAULT_PREFS,
      userPrompt: 'STALE PROMPT',
      language: 'zh' as const,
    }
    seedStorage({ dh_prefs: stale })
    const initialGet = deferNextStorageGet('dh_prefs')
    const { result } = renderHook(() => usePrefs())

    act(() => {
      emitStorageChanges({
        dh_prefs: { oldValue: stale, newValue: undefined },
      })
    })
    await act(async () => initialGet.resolve(undefined))

    expect(result.current.prefs).toEqual(DEFAULT_PREFS)
  })
})
