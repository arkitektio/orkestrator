import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * P17, asserted for the chart: React subscribes to SCALARS, never to whole
 * per-layer records. See `core/data/plot/storeSelectors.test.ts` for the rule;
 * this holds the chart's own components to it.
 *
 * Subscribe to ONE entry (`s.packed[id]`, `s.layerIndex.get(id)`), to a version
 * scalar, or to a string key standing for a list (`useAnnotationLayerIds`).
 * The chart has no allowlist entry: its layer list is rendered by the plot
 * engine's panel, which carries the one exception there.
 */

const ROOT = dirname(fileURLToPath(import.meta.url));

const RECORDS = new Set([
  "layers",
  "serverLayers",
  "rawLayers",
  "layerIndex",
  "patches",
  "stats",
  "readouts",
  "markLabels",
  "bands",
  "clims",
  "probeSources",
  "packed",
]);

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
};

const SELECTOR =
  /use(?:Chart|Plot|Viewer|Trace|Range|ChartAnnotation)Store\(\s*\(?(\w+)\)?\s*=>\s*\1\.(\w+)\s*\)/g;

describe("chart store selectors", () => {
  const files = walk(ROOT);

  it("scans the renderer", () => {
    expect(files.length).toBeGreaterThan(25);
  });

  it("no component subscribes to a whole per-layer record", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(SELECTOR)) {
        if (RECORDS.has(match[2])) {
          offenders.push(`${relative(ROOT, file)}: subscribes to the whole \`${match[2]}\``);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
