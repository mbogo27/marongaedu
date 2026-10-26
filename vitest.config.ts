import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` throws outside the Next.js server bundle; tests run in plain Node.
      "server-only": path.resolve(__dirname, "tests/support/server-only-stub.ts"),
    },
    conditions: ["react-server"],
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    globalSetup: ["tests/support/global-setup.ts"],
    setupFiles: ["tests/support/setup.ts"],
    // Integration tests share one database: run files serially.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
