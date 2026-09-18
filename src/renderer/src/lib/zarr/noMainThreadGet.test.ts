import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * No zarr read runs on the main thread, and no array is opened past the runner.
 *
 * zarrita's own `get()` fetches and decodes on the MAIN thread, and plans its
 * chunk reads against `arr.chunks`, which for a `sharding_indexed` array is the
 * SHARD shape: a sliver read then fetches whole shards. A bare `open.v3` skips the
 * metadata read that makes `effectiveChunkShapeOf` answerable, which is how a
 * reader ends up dividing by the shard shape and naming the wrong chunk.
 *
 * So, anywhere in the renderer outside `lib/zarr/`:
 *  - no VALUE import of `get` or `open` from "zarrita" (types are fine). Read
 *    with `readArrayWindow` / `getChunkGroupWorker`; open with `openZarrArray`;
 *  - no chunk planning on `arr.chunks` / `array.chunks`. Use
 *    `effectiveChunkShapeOf`.
 *
 * Both rules were broken in four places when this test was written (mikro's
 * vectors, sparse slices and exact probe), all fixed alongside it.
 */

// __dirname is src/renderer/src/lib/zarr.
const SRC_ROOT = resolve(__dirname, "../..");
const ZARR_ROOT = resolve(__dirname);

/** `.chunks` reads that are not planning, each with the reason it is allowed. */
const CHUNKS_ALLOWLIST: Record<string, string> = {
  // Compares the inner shape with the shard shape to REPORT sharding (debug).
  "mikro-next/components/scene/features/bricks/residency/brickResidency.ts":
    "debug report: compares effective (inner) chunks with the shard shape",
  // `effectiveChunkShapeOf(arr) ?? arr.chunks`: the fallback is only reached
  // for an unsharded array (where the two agree) or a test fixture.
  "mikro-next/components/scene/platform/coords/levelGeometry.ts":
    "fallback beside effectiveChunkShapeOf, unsharded arrays and fixtures only",
};

const sourceFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
};

const stripComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/** Value (non-type) names imported from "zarrita" in one file. */
const zarritaValueImports = (text: string): string[] => {
  const names: string[] = [];
  for (const m of text.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s*from\s*["']zarrita["']/g)) {
    if (m[1]) continue; // `import type { … }`
    for (const raw of m[2].split(",")) {
      const name = raw.trim();
      if (!name || name.startsWith("type ")) continue;
      names.push(name.split(/\s+as\s+/)[0].trim());
    }
  }
  return names;
};

describe("zarritaValueImports (the guard's parser)", () => {
  it("sees value imports and ignores type-only ones", () => {
    expect(zarritaValueImports('import { get, slice } from "zarrita";')).toEqual(["get", "slice"]);
    expect(zarritaValueImports('import { open as o, type Array } from "zarrita";')).toEqual(["open"]);
    expect(zarritaValueImports('import type { Chunk } from "zarrita";')).toEqual([]);
  });
});

describe("zarr reads go through the worker runner", () => {
  const files = sourceFiles(SRC_ROOT).filter((f) => !f.startsWith(ZARR_ROOT));

  it("scans the renderer (a guard that scans nothing passes forever)", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("never imports zarrita's main-thread get() or bare open outside lib/zarr", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = stripComments(readFileSync(file, "utf8"));
      for (const name of zarritaValueImports(text)) {
        if (name === "get" || name === "open") {
          offenders.push(`${relative(SRC_ROOT, file)}: imports \`${name}\` from zarrita`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("never plans chunk reads on arr.chunks (the SHARD shape) outside lib/zarr", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const rel = relative(SRC_ROOT, file);
      if (rel in CHUNKS_ALLOWLIST) continue;
      const text = stripComments(readFileSync(file, "utf8"));
      if (/\b(arr|array|zarrArray)\.chunks\b/.test(text)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it("keeps the allowlist honest (every entry still exists and still needs it)", () => {
    for (const rel of Object.keys(CHUNKS_ALLOWLIST)) {
      const text = stripComments(readFileSync(join(SRC_ROOT, rel), "utf8"));
      expect(/\b(arr|array|zarrArray)\.chunks\b/.test(text), rel).toBe(true);
    }
  });
});
