import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const sharedEntry = fileURLToPath(
  new URL("../shared/src/index.ts", import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: {
      "@rewind/shared": sharedEntry,
    },
  },
  test: {
    name: "@rewind/recorder",
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
  },
});
