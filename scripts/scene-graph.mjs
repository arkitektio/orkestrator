#!/usr/bin/env node
/**
 * Scene import-graph walker.
 *
 * Reporting tool for the scene restructure (see the plan's Phase 0). It resolves
 * every intra-`scene/` import to a (importer bucket -> imported bucket) edge and
 * prints the matrix plus any edge that violates the target layering.
 *
 * It is DELIBERATELY report-only: during the move phases a violation is expected
 * and informative, not a failure. `scene/architecture.test.ts` is the asserting
 * counterpart, switched on once the tree has landed (Phase 5).
 *
 *   node scripts/scene-graph.mjs              # matrix + violations
 *   node scripts/scene-graph.mjs --edges      # every individual violating edge
 *   node scripts/scene-graph.mjs --json       # machine-readable
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCENE = join(ROOT, "src/renderer/src/mikro/components/scene");
const ALIAS_PREFIX = "@/mikro/components/scene/";

/** Bucket a scene-relative path into the unit the layering rules talk about. */
export const bucketOf = (rel) => {
  const parts = rel.split("/");
  if (parts.length === 1) return "(root)";
  // platform/gpu, features/bricks, shell/keyboard — two levels, since the rules
  // distinguish sibling features but not files within one.
  if (parts[0] === "features" || parts[0] === "platform" || parts[0] === "shell") {
    // tier/sub for a nested file; the bare tier for one sitting directly in it.
    return parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0];
  }
  return parts[0];
};

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "__fixtures__") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
};

/** Resolve a specifier to a scene-relative file path, or null if it leaves scene/. */
const resolveTarget = (fromFile, spec) => {
  let abs;
  if (spec.startsWith(".")) abs = resolve(dirname(fromFile), spec);
  else if (spec.startsWith(ALIAS_PREFIX)) abs = join(SCENE, spec.slice(ALIAS_PREFIX.length));
  else return null;
  const rel = relative(SCENE, abs);
  if (rel.startsWith("..")) return null; // left the scene
  for (const cand of [abs, `${abs}.ts`, `${abs}.tsx`, join(abs, "index.ts"), join(abs, "index.tsx")]) {
    if (existsSync(cand) && statSync(cand).isFile()) return relative(SCENE, cand);
  }
  return rel; // unresolved (e.g. a worker `.js` twin) — still a real edge
};

// The bound spans a whole named-import list, so it must clear the LONGEST one
// in the tree — `DebugPanel`'s shader-flag block is already 417 chars. This is
// a silent-failure cap: an import that overruns it is not reported as
// unparseable, it simply stops being an edge, which reads as a layering
// violation having been FIXED. (That is exactly how it bit us: adding two flag
// names to that block made a real `features/debug -> features/bricks` edge
// vanish and the sideways ratchet demand its budget be lowered.) Keep it well
// clear of the longest block, and prefer raising it to trimming an import.
const IMPORT_RE = /(?:^|\n)\s*(?:import|export)[\s\S]{0,2000}?from\s+["']([^"']+)["']/g;
const TYPE_ONLY_RE = /(?:^|\n)\s*(?:import|export)\s+type\s/;

const files = walk(SCENE);
const edges = [];
for (const file of files) {
  const rel = relative(SCENE, file);
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(IMPORT_RE)) {
    const target = resolveTarget(file, m[1]);
    if (!target) continue;
    edges.push({
      from: rel,
      to: target,
      fromBucket: bucketOf(rel),
      toBucket: bucketOf(target),
      typeOnly: TYPE_ONLY_RE.test(m[0]),
      test: /\.(test|spec)\.tsx?$/.test(rel),
    });
  }
}

/* ---- the target layering rules (plan §Enforcement) ---------------------- */

const FEATURE_ALLOW = new Set([
  "features/volume->features/bricks",
  "features/labels->features/bricks",
  "features/probe->features/bricks",
  "features/annotations->features/bricks",
]);

const violations = [];
for (const e of edges) {
  if (e.test) continue; // test-only edges are not production layering facts
  const { fromBucket: f, toBucket: t } = e;
  if (f === t) continue;
  const tier = (b) => b.split("/")[0];
  if (tier(f) === "platform" && (tier(t) === "features" || tier(t) === "shell"))
    violations.push({ ...e, rule: "platform must not import features/shell" });
  else if (tier(f) === "features" && tier(t) === "features" && !FEATURE_ALLOW.has(`${f}->${t}`))
    violations.push({ ...e, rule: "features must not import sibling features" });
  else if (tier(f) === "features" && tier(t) === "shell")
    violations.push({ ...e, rule: "features must not import shell" });
  else if ((f === "platform/model" || f === "platform/coords") && tier(t) !== "platform")
    violations.push({ ...e, rule: `${f} must be a leaf` });
}

/* ---- output -------------------------------------------------------------- */

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ files: files.length, edges: edges.length, violations }, null, 2));
} else {
  const buckets = [...new Set(edges.flatMap((e) => [e.fromBucket, e.toBucket]))].sort();
  const count = new Map();
  for (const e of edges) count.set(`${e.fromBucket}->${e.toBucket}`, (count.get(`${e.fromBucket}->${e.toBucket}`) ?? 0) + 1);
  const w = Math.max(...buckets.map((b) => b.length)) + 1;
  console.log(`scene import graph — ${files.length} files, ${edges.length} intra-scene edges\n`);
  console.log("rows = importer, cols = imported\n");
  console.log("".padEnd(w) + buckets.map((b) => String(b.length > 6 ? b.slice(-6) : b).padStart(7)).join(""));
  for (const a of buckets)
    console.log(a.padEnd(w) + buckets.map((b) => String(count.get(`${a}->${b}`) ?? ".").padStart(7)).join(""));

  console.log(`\n${violations.length} layering violation(s)`);
  const byRule = new Map();
  for (const v of violations) byRule.set(v.rule, [...(byRule.get(v.rule) ?? []), v]);
  for (const [rule, vs] of byRule) {
    console.log(`\n  ${rule} — ${vs.length}`);
    const show = process.argv.includes("--edges") ? vs : vs.slice(0, 8);
    for (const v of show) console.log(`    ${v.from}\n      -> ${v.to}${v.typeOnly ? "  (type-only)" : ""}`);
    if (!process.argv.includes("--edges") && vs.length > show.length)
      console.log(`    … ${vs.length - show.length} more (--edges to list)`);
  }
}
