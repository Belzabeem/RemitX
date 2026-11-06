import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    // Exclude agent worktree snapshots — they contain stale copies of the
    // same tests and would double-run (and fail against old fixtures).
    exclude: ["**/node_modules/**", "**/.kilo/**"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/app/api/**"],
      exclude: ["**/__tests__/**", "**/*.test.ts"],
      reporter: ["text-summary", "lcov"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
