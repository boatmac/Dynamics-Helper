import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Reset DOM between tests to prevent state leaking across React component tests.
afterEach(() => {
  cleanup()
})
