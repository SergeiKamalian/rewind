import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: {
    // tsup roots only the entry file. Composite projects then reject
    // imported files in subfolders (TS6307). Declaration emit does not
    // use project references, so composite stays on for `tsc -b` only.
    compilerOptions: {
      composite: false,
      incremental: false,
    },
  },
  clean: true,
  sourcemap: true,
  target: "es2022",
});
