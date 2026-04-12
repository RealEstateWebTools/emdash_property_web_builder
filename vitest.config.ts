import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.test.{ts,js}',
      'packages/**/src/**/*.test.{ts,js}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts', 'src/**/*.astro'],
      exclude: ['src/test/**'],
      thresholds: {
        statements: 73,
        branches: 73,
        functions: 68,
        lines: 72,
      },
    },
  },
})
