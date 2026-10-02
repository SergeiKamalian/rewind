import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: {
    // Same as @rewind/shared: nested sources fail the DTS build while
    // composite is on, because tsup roots only the entry file.
    compilerOptions: {
      composite: false,
      incremental: false,
    },
  },
  clean: true,
  sourcemap: true,
  target: "es2022",
  external: ["@rewind/shared"],
});
