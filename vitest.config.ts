import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      exclude: ['**/test/**', '**/*.test.ts', '**/build/**', "**/build/src/**", "**/build/server/**"],
    },
    exclude: [
      'build/**', // Exclude all build output
      'node_modules/**',
      'dist/**',
      '.git/**',
    ],
  },
});
