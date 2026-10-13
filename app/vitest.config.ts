import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// View-models, services, shared libs and targeted DOM regressions. TV rendering is verified on the TV.
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify('test') },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
})
