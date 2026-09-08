import { useLayoutEffect, useRef, useState } from 'react'

const ACK_DELAY_MS = 8_000

export type VisibleCompletionAckOptions = Readonly<{
  transactionId: string | null
  surfaceVisible: boolean
}>

export function useVisibleCompletionAck({
  transactionId,
  surfaceVisible,
}: VisibleCompletionAckOptions): void {
  const currentTransactionIdRef = useRef(transactionId)
  const currentSurfaceVisibleRef = useRef(surfaceVisible)
  const documentVisibleRef = useRef(false)
  const generationRef = useRef(0)
  const attemptedGenerationRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null)
  const [visibilityRevision, setVisibilityRevision] = useState(0)

  useLayoutEffect(() => {
    documentVisibleRef.current = document.visibilityState === 'visible'
    const handleVisibilityChange = (): void => {
      const nextVisible = document.visibilityState === 'visible'
      if (nextVisible === documentVisibleRef.current) return
      documentVisibleRef.current = nextVisible
      generationRef.current += 1
      if (timerRef.current !== null) {
        globalThis.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setVisibilityRevision(current => current + 1)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      generationRef.current += 1
    }
  }, [])

  useLayoutEffect(() => {
    currentTransactionIdRef.current = transactionId
    currentSurfaceVisibleRef.current = surfaceVisible
    const generation = generationRef.current + 1
    generationRef.current = generation
    if (timerRef.current !== null) {
      globalThis.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (
      transactionId === null
      || !surfaceVisible
      || !documentVisibleRef.current
      || document.visibilityState !== 'visible'
    ) return

    const capturedTransactionId = transactionId
    const timeoutId = globalThis.setTimeout(() => {
      if (
        timerRef.current !== timeoutId
        || generationRef.current !== generation
        || attemptedGenerationRef.current === generation
        || currentTransactionIdRef.current !== capturedTransactionId
        || !currentSurfaceVisibleRef.current
        || !documentVisibleRef.current
        || document.visibilityState !== 'visible'
      ) return

      attemptedGenerationRef.current = generation
      try {
        const response = chrome.runtime.sendMessage({
          type: 'DH_UPDATE_ACK_COMPLETE',
          transactionId: capturedTransactionId,
        })
        void Promise.resolve(response).catch(() => undefined)
      } catch {
        // A destroyed Extension context must not alter authoritative UI.
      }
      if (timerRef.current === timeoutId) timerRef.current = null
    }, ACK_DELAY_MS)
    timerRef.current = timeoutId

    return () => {
      generationRef.current += 1
      if (timerRef.current === timeoutId) {
        globalThis.clearTimeout(timeoutId)
        timerRef.current = null
      }
    }
  }, [transactionId, surfaceVisible, visibilityRevision])
}
