/// <reference types="vitest/config" />
import { resolve } from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Standalone test config — intentionally separate from `electron.vite.config.ts`
// so we don't drag in the Electron main/preload build wiring. We only test the
// renderer here. The `@` alias mirrors electron.vite.config.ts.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src/renderer/src"),
    },
  },
  test: {
    globals: true,
    // Pure-logic suites run in `node` for speed. Suites that touch the DOM /
    // window opt into jsdom per-file via a `// @vitest-environment jsdom`
    // docblock at the top of the file.
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/renderer/src/**/*.{test,spec}.{ts,tsx}",
      // Main-process code is mostly untestable here (it imports `electron`),
      // but its pure helpers are — deep-link path parsing, for one.
      "src/main/**/*.{test,spec}.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      // Scope coverage to the modules we actually test for now, so the number
      // is meaningful instead of ~0% diluted across the whole 1000-file tree.
      // Widen this list as more suites are added.
      include: [
        "src/renderer/src/lib/marks/*.ts",
        "src/renderer/src/reaktion/validation/utils.tsx",
        "src/renderer/src/lib/utils.ts",
        "src/renderer/src/blok/renderer/runtime/utils.ts",
        "src/renderer/src/blok/renderer/runtime/context.tsx",
        "src/renderer/src/blok/renderer/runtime/resolution.ts",
        "src/renderer/src/blok/renderer/runtime/scope.tsx",
        "src/renderer/src/blok/renderer/runtime/functions.ts",
        "src/renderer/src/blok/renderer/runtime/preflight.ts",
        "src/renderer/src/blok/renderer/runtime/checks.ts",
        "src/renderer/src/blok/renderer/functions/**/*.ts",
        "src/renderer/src/rekuest/widgets/utils.tsx",
        "src/renderer/src/lib/localactions/LocalActionProvider.tsx",
        "src/renderer/src/providers/selection/store.tsx",
        "src/renderer/src/providers/dashboard/store.ts",
        "src/renderer/src/lib/arkitekt/index.tsx",
      ],
      // Generated GraphQL artifacts are never worth covering.
      exclude: ["**/api/graphql.ts", "**/api/fragments.ts"],
    },
  },
});
