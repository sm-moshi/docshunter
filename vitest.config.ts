import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    root: "./",
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "lcov", "html", "json"],
      include: ["src/**/*.ts"],
      exclude: [
        "build",
        "scripts",
        "docs",
        "**/*.d.ts",
        "**/node_modules/**",
        "**/vitest.config.ts",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/__tests__/**",
        "src/main.ts", // Entry point, not core logic
      ],
      thresholds: {
        statements: 1.8,
        branches: 1.8,
        functions: 1.8,
        lines: 1.8,
      },
    },
    testTimeout: 10000, // 10 seconds for integration tests
    hookTimeout: 10000,
  },
});
