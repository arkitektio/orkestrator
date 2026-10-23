import * as React from "react";

import type { BlokRenderArgs } from "@/core/blok/renderer/runtime";

/**
 * A blok render loaded on first use. The definitions next to it are exported
 * offline with the catalog (`scripts/export-blok-catalog.mjs`), where what the
 * renders reach for — three.js, WebGPU, DuckDB-WASM — cannot load, so a
 * definition imports its render lazily and nothing else of it.
 */
export const lazily =
  (Part: React.ComponentType<BlokRenderArgs>) =>
  (args: BlokRenderArgs): React.ReactElement => (
    <React.Suspense fallback={null}>
      <Part {...args} />
    </React.Suspense>
  );
