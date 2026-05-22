import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Standalone Vitest config — does NOT extend vite.config.ts because CRXJS
// (@crxjs/vite-plugin) transforms HTML entry points and assumes a browser-
// extension build context, which breaks unit tests under jsdom. We only
// share the React plugin (needed for JSX/TSX transform in tests).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // forks pool is safer than threads with React 19 + jsdom shared state
    pool: 'forks',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/test/**'],
    },
  },
})
