import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The experiment renderer's import rules, asserted.
 *
 * `ARCHITECTURE.md` states them; this keeps them true. Transposed from mikro's
 * `scene/architecture.test.ts`, with one deliberate difference: mikro's sideways
 * list is a RATCHET over edges that already existed when the rules arrived. This
 * tree was built under the rules, so `KNOWN_SIDEWAYS` starts EMPTY — and the one
 * advantage a greenfield has is that it can stay that way. Adding an entry needs a
 * reason in ARCHITECTURE.md; the better fix is almost always to move the shared
 * thing down into `platform/`.
 */

const ROOT = dirname(fileURLToPath(import.meta.url));
const ALIAS_PREFIX = "@/elektro/components/experiment/";

/** `traces` is the shared engine — the one feature other features may import. */
const FEATURE_ALLOWLIST = new Set([
  "features/spikes->features/traces",
  "features/events->features/traces",
  "features/annotations->features/traces",
  "features/probe->features/traces",
  "features/stacking->features/traces",
]);

/** Sideways edges tolerated today. Empty, and meant to stay empty. */
const KNOWN_SIDEWAYS: Record<string, number> = {};

type Edge = { from: string; to: string; fromBucket: string; toBucket: string };

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "__fixtures__") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
};

const bucketOf = (rel: string): string => {
  const parts = rel.split("/");
  if (parts.length === 1) return "(root)";
  if (["features", "platform", "shell"].includes(parts[0])) {
    return parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0];
  }
  return parts[0];
};

const resolveTarget = (fromFile: string, spec: string): string | null => {
  let abs: string;
  if (spec.startsWith(".")) abs = resolve(dirname(fromFile), spec);
  else if (spec.startsWith(ALIAS_PREFIX)) abs = join(ROOT, spec.slice(ALIAS_PREFIX.length));
  else return null;
  const rel = relative(ROOT, abs);
  if (rel.startsWith("..")) return null;
  for (const cand of [abs, `${abs}.ts`, `${abs}.tsx`, join(abs, "index.ts")]) {
    if (existsSync(cand) && statSync(cand).isFile()) return relative(ROOT, cand);
  }
  return null;
};

// Wide bound: a long named-import list must not silently stop being an edge.
const IMPORT_RE = /(?:^|\n)\s*(?:import|export)[\s\S]{0,2000}?from\s+["']([^"']+)["']/g;

const edges: Edge[] = [];
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  if (/\.(test|spec)\.tsx?$/.test(rel)) continue;
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(IMPORT_RE)) {
    const to = resolveTarget(file, m[1]);
    if (!to) continue;
    edges.push({ from: rel, to, fromBucket: bucketOf(rel), toBucket: bucketOf(to) });
  }
}

const tier = (bucket: string) => bucket.split("/")[0];
const show = (es: Edge[]) => es.map((e) => `  ${e.from}\n    -> ${e.to}`).join("\n");

describe("experiment architecture", () => {
  it("finds the import graph", () => {
    // A resolver that silently matched nothing would make every rule pass.
    expect(edges.length).toBeGreaterThan(60);
  });

  it("platform imports nothing from features or shell", () => {
    const bad = edges.filter(
      (e) => tier(e.fromBucket) === "platform" && ["features", "shell"].includes(tier(e.toBucket)),
    );
    expect(bad.length, `platform/ must not know about a feature:\n${show(bad)}`).toBe(0);
  });

  it("features import nothing from shell", () => {
    const bad = edges.filter(
      (e) => tier(e.fromBucket) === "features" && tier(e.toBucket) === "shell",
    );
    expect(
      bad.length,
      `shell/ is the composition root — it knows features, not the reverse:\n${show(bad)}`,
    ).toBe(0);
  });

  it("shell is imported only by ExperimentScene.tsx", () => {
    const bad = edges.filter(
      (e) =>
        tier(e.toBucket) === "shell" &&
        tier(e.fromBucket) !== "shell" &&
        e.from !== "ExperimentScene.tsx",
    );
    expect(bad.length, `only the public API may reach into shell/:\n${show(bad)}`).toBe(0);
  });

  it("platform/model and platform/coords are leaves", () => {
    const bad = edges.filter(
      (e) =>
        ["platform/model", "platform/coords"].includes(e.fromBucket) &&
        tier(e.toBucket) !== "platform",
    );
    expect(bad.length, `the vocabulary must depend on nothing above it:\n${show(bad)}`).toBe(0);
  });

  it("features do not reach sideways", () => {
    const counts: Record<string, number> = {};
    for (const e of edges) {
      if (
        tier(e.fromBucket) === "features" &&
        tier(e.toBucket) === "features" &&
        e.fromBucket !== e.toBucket &&
        !FEATURE_ALLOWLIST.has(`${e.fromBucket}->${e.toBucket}`)
      ) {
        const key = `${e.fromBucket}->${e.toBucket}`;
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
    for (const [key, n] of Object.entries(counts)) {
      expect(
        n,
        `${key}: ${n} sideways import(s). Move the shared piece into platform/ rather than adding it to KNOWN_SIDEWAYS.`,
      ).toBeLessThanOrEqual(KNOWN_SIDEWAYS[key] ?? 0);
    }
  });
});
