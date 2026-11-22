import * as React from "react";

import type { BlokRenderArgs } from "@arkitektio/bsx/renderer/runtime/index";

/**
 * A blok render in its own chunk. The definitions next to it are exported
 * offline with the catalog (`scripts/export-blok-catalog.mjs`), where what the
 * renders reach for — three.js, WebGPU, DuckDB-WASM — cannot load, so a
 * definition imports its render dynamically and nothing else of it. In the app
 * the chunk is loaded before the first render (`preloadable`); the Suspense
 * here only catches a render that was not preloaded (a test).
 */
export const lazily =
  (Part: React.ComponentType<BlokRenderArgs>) =>
  (args: BlokRenderArgs): React.ReactElement => (
    <React.Suspense fallback={null}>
      <Part {...args} />
    </React.Suspense>
  );
