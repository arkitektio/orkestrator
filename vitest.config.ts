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
    // @arkitektio/bsx is processed like this app's own source: its runtime Tailwind reads
    // stylesheets as text (`?raw`) and its shadcn copies import CJS packages by name.
    server: { deps: { inline: ["@arkitektio/bsx"] } },
    // CSS is stubbed out in tests, `?raw` imports included. The stylesheets the
    // runtime Tailwind compiler for bloks reads (`@arkitektio/bsx/tailwind`) must be
    // real text, so these alone are processed.
    css: { include: [/tailwindcss\/(theme|utilities)\.css/, /src\/renderer\/src\/theme\.css/] },
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
        "src/renderer/src/kabinet/lib/marks/*.ts",
        "src/renderer/src/fluss/validation/utils.tsx",
        "src/renderer/src/core/util/utils.ts",
        "src/renderer/src/rekuest/widgets/utils.tsx",
        "src/renderer/src/core/smart/localactions/LocalActionProvider.tsx",
        "src/renderer/src/core/dnd/selection/store.tsx",
        "src/renderer/src/core/dashboard/store.ts",
        "src/renderer/src/core/connection/arkitekt/index.tsx",
      ],
      // Generated GraphQL artifacts are never worth covering.
      exclude: ["**/api/graphql.ts", "**/api/fragments.ts"],
    },
  },
});
