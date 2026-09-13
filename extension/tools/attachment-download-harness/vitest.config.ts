import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    root: fileURLToPath(new URL('../../', import.meta.url)),
    test: {
        environment: 'node',
        pool: 'forks',
        include: [
            'tools/attachment-download-harness/observer.test.ts',
            'tools/attachment-download-harness/portal.test.ts',
            'tools/attachment-download-harness/page.test.ts',
        ],
        setupFiles: [],
    },
})
