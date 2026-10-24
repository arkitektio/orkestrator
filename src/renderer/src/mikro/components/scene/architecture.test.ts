import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The scene's import rules, asserted.
 *
 * `ARCHITECTURE.md` states them; this keeps them true. The old `core/` grew to
 * 153 files precisely because nothing checked — docs alone have a short
 * half-life, and every one of the layering violations this suite pins was
 * cheap to introduce and expensive to find.
 *
 * Three rules, each a hard zero.
 */

const SCENE = dirname(fileURLToPath(import.meta.url));
const ALIAS_PREFIX = "@/mikro/components/scene/";

type Edge = { from: string; to: string; fromBucket: string; toBucket: string; typeOnly: boolean };

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "__fixtures__") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
};

/** tier/sub for a nested file; the bare tier for one sitting directly in it. */
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
  else if (spec.startsWith(ALIAS_PREFIX)) abs = join(SCENE, spec.slice(ALIAS_PREFIX.length));
  else return null;
  const rel = relative(SCENE, abs);
  if (rel.startsWith("..")) return null; // left the scene
  for (const cand of [abs, `${abs}.ts`, `${abs}.tsx`, join(abs, "index.ts")]) {
    if (existsSync(cand) && statSync(cand).isFile()) return relative(SCENE, cand);
  }
  return null;
};

// Keep in lockstep with `scripts/scene-graph.mjs`. The bound spans a whole
// named-import list, so it must clear the LONGEST one in the tree
// (`DebugPanel`'s shader-flag block is already 417 chars). It is a
// SILENT-FAILURE cap: an import that overruns it is not reported as
// unparseable, it just stops being an edge — which reads here as a layering
// violation having been fixed, and makes this very ratchet demand that a budget
// be lowered for a violation that never went away. Raise it rather than trim an
// import.
const IMPORT_RE = /(?:^|\n)\s*(?:import|export)[\s\S]{0,2000}?from\s+["']([^"']+)["']/g;

const edges: Edge[] = [];
for (const file of walk(SCENE)) {
  const rel = relative(SCENE, file);
  // Test-only edges are not production layering facts: a contract test may
  // legitimately reach across to assert two sides agree.
  if (/\.(test|spec)\.tsx?$/.test(rel)) continue;
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(IMPORT_RE)) {
    const to = resolveTarget(file, m[1]);
    if (!to) continue;
    edges.push({
      from: rel,
      to,
      fromBucket: bucketOf(rel),
      toBucket: bucketOf(to),
      typeOnly: /^\s*(?:import|export)\s+type\s/.test(m[0].trim()),
    });
  }
}

const tier = (bucket: string) => bucket.split("/")[0];
const show = (es: Edge[]) => es.map((e) => `  ${e.from}\n    -> ${e.to}`).join("\n");

describe("scene architecture", () => {
  it("finds the import graph", () => {
    // Guards the suite itself: a resolver that silently matches nothing would
    // make every assertion below pass for the wrong reason.
    expect(edges.length).toBeGreaterThan(900);
  });

  it("platform imports nothing from features or shell", () => {
    const bad = edges.filter(
      (e) =>
        tier(e.fromBucket) === "platform" &&
        ["features", "shell"].includes(tier(e.toBucket)),
    );
    expect(
      bad.length,
      `platform/ must not know about a feature:\n${show(bad)}`,
    ).toBe(0);
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

  it("platform/model and platform/coords are leaves", () => {
    const bad = edges.filter(
      (e) =>
        ["platform/model", "platform/coords"].includes(e.fromBucket) &&
        tier(e.toBucket) !== "platform",
    );
    expect(
      bad.length,
      `the layer vocabulary must depend on nothing above it:\n${show(bad)}`,
    ).toBe(0);
  });

});
