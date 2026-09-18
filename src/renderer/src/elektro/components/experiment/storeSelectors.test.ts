import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * P17, asserted: React subscribes to SCALARS, never to whole records.
 *
 * The render plane (drivers, `bindFields`, imperative matrix writes) writes the
 * per-layer records — stats, readouts, labels, packed lines, draws, marks — at
 * data cadence. A component that subscribes to a whole record re-renders on
 * every write for every layer, which is exactly the churn the two-plane rule
 * exists to prevent. Subscribe to ONE entry (`s.packed[id]`), to a version
 * scalar (`statsVersion`, `labelsVersion`, `probeVersion`, …) and read the
 * record through `getState()`, or to a derived scalar the slice maintains.
 *
 * The allowlist is for records that legitimately change at UI cadence and are
 * rendered as a list; each entry carries its reason. Mirrors mikro's
 * `scene/storeSelectors.test.ts`.
 */

const ROOT = dirname(fileURLToPath(import.meta.url));

/** Per-layer records written by drivers / folds — never subscribe to the whole. */
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
  "eventDraws",
  "spikeDraws",
  "annotationMarks",
  "pickerProblems",
]);

const ALLOWLIST: Record<string, Record<string, string>> = {
  "experimentHost.ts": {
    layers: "the host API returns the layer list as plain data; a list at UI cadence",
  },
  "shell/layerPanel/LayerControlPanel.tsx": {
    layers: "the panel renders one card per layer; a list at UI cadence",
  },
  "shell/chrome/OverviewStrip.tsx": {
    layers: "one extent bar per layer; changes only on a fold or an edit",
  },
};

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
};

const SELECTOR =
  /use(?:Experiment|Viewer|Trace|Events|Spikes|Picker|Annotation)Store\(\s*\(?(\w+)\)?\s*=>\s*\1\.(\w+)\s*\)/g;

describe("experiment store selectors", () => {
  const files = walk(ROOT);

  it("scans the renderer", () => {
    expect(files.length).toBeGreaterThan(60);
  });

  it("no component outside the allowlist subscribes to a whole per-layer record", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const rel = relative(ROOT, file);
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(SELECTOR)) {
        const field = match[2];
        if (!RECORDS.has(field)) continue;
        if (ALLOWLIST[rel]?.[field]) continue;
        offenders.push(`${rel}: subscribes to the whole \`${field}\``);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps the allowlist honest", () => {
    for (const [rel, fields] of Object.entries(ALLOWLIST)) {
      const text = readFileSync(join(ROOT, rel), "utf8");
      const found = new Set([...text.matchAll(SELECTOR)].map((m) => m[2]));
      for (const field of Object.keys(fields)) expect(found.has(field), `${rel} ${field}`).toBe(true);
    }
  });
});
