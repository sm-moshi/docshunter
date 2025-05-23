import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "lcov"],
      exclude: [
        "build",
        "scripts",
        "docs",
        "**/*.d.ts",
        "**/node_modules/**",
        "**/vitest.config.ts",
      ],
    },
  },
});
