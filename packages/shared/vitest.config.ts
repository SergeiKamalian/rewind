import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@rewind/shared",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
