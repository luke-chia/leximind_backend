import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Globals - Permite usar describe, it, expect sin importar
    globals: true,

    // Environment - Node.js para testing de APIs
    environment: 'node',

    // Setup files - Ejecutados antes de cada suite de tests
    setupFiles: ['./tests/setup/vitest.setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts',
        '**/index.ts',
        'src/data/mongodb/**', // MongoDB no se usa actualmente
      ],
      all: true,
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    },

    // Include patterns
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],

    // Exclude patterns
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],

    // Test timeout (ms)
    testTimeout: 10000,

    // Hook timeout (ms)
    hookTimeout: 10000,

    // Silent console logs during tests
    silent: false,

    // Reporters
    reporters: ['verbose'],

    // Watch mode configuration
    watch: false,

    // Threads - usa workers para paralelizar tests
    threads: true,

    // Max threads
    maxThreads: 4,

    // Min threads
    minThreads: 1,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@domain': resolve(__dirname, './src/domain'),
      '@infrastructure': resolve(__dirname, './src/infrastructure'),
      '@presentation': resolve(__dirname, './src/presentation'),
      '@config': resolve(__dirname, './src/config'),
      '@tests': resolve(__dirname, './tests'),
    },
  },
})
