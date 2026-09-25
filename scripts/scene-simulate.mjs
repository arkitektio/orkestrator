#!/usr/bin/env node
/**
 * Simulate the post-move layering.
 *
 * Applies scene-manifest.mjs to today's import graph and reports which edges
 * WOULD violate the target rules once the files move. This is the Phase 0 edge
 * triage: every violation here must be resolved (invert it, or demote the
 * shared symbol to platform/) or consciously allowlisted BEFORE Phase 1.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { destinationOf, SCENE } from "./scene-manifest.mjs";

const ALIAS = "@/mikro/components/scene/";
const walk = (d, out = []) => {
  for (const e of readdirSync(d)) {
    if (e === "node_modules" || e === "__fixtures__") continue;
    const f = join(d, e);
    statSync(f).isDirectory() ? walk(f, out) : /\.tsx?$/.test(e) && out.push(f);
  }
  return out;
};
const newPathOf = (rel) => {
  const dest = destinationOf(rel);
  return dest === null ? rel : dest === "." ? basename(rel) : join(dest, basename(rel));
};
const bucketOf = (rel) => {
  const p = rel.split("/");
  if (p.length === 1) return "(root)";
  return p[0] === "features" || p[0] === "platform" || p[0] === "shell"
    ? (p.length > 2 ? `${p[0]}/${p[1]}` : p[0]) : p[0];
};
const resolveTarget = (fromFile, spec) => {
  let abs;
  if (spec.startsWith(".")) abs = resolve(dirname(fromFile), spec);
  else if (spec.startsWith(ALIAS)) abs = join(SCENE, spec.slice(ALIAS.length));
  else return null;
  const rel = relative(SCENE, abs);
  if (rel.startsWith("..")) return null;
  for (const c of [abs, `${abs}.ts`, `${abs}.tsx`, join(abs, "index.ts")])
    if (existsSync(c) && statSync(c).isFile()) return relative(SCENE, c);
  return rel;
};

const FEATURE_ALLOW = new Set([
  "features/volume->features/bricks", "features/labels->features/bricks",
  "features/probe->features/bricks", "features/annotations->features/bricks",
]);
const IMPORT_RE = /(?:^|\n)\s*(?:import|export)[\s\S]{0,400}?from\s+["']([^"']+)["']/g;

const violations = [];
for (const file of walk(SCENE)) {
  const rel = relative(SCENE, file);
  const isTest = /\.(test|spec)\.tsx?$/.test(rel);
  const fb = bucketOf(newPathOf(rel));
  for (const m of readFileSync(file, "utf8").matchAll(IMPORT_RE)) {
    const t = resolveTarget(file, m[1]);
    if (!t) continue;
    const tb = bucketOf(newPathOf(t));
    if (fb === tb) continue;
    const tier = (b) => b.split("/")[0];
    let rule = null;
    if (tier(fb) === "platform" && ["features", "shell"].includes(tier(tb))) rule = "platform -> features/shell";
    else if (tier(fb) === "features" && tier(tb) === "features" && !FEATURE_ALLOW.has(`${fb}->${tb}`)) rule = "feature -> sibling feature";
    else if (tier(fb) === "features" && tier(tb) === "shell") rule = "feature -> shell";
    else if (["platform/model", "platform/coords"].includes(fb) && tier(tb) !== "platform") rule = `${fb} not a leaf`;
    if (rule) violations.push({ rule, edge: `${fb} -> ${tb}`, from: rel, to: t, typeOnly: /^\s*(import|export)\s+type\s/.test(m[0].trim()), isTest });
  }
}

const prod = violations.filter((v) => !v.isTest);
console.log(`POST-MOVE SIMULATION — ${prod.length} production violation(s), ${violations.length - prod.length} test-only\n`);
const byEdge = new Map();
for (const v of prod) byEdge.set(v.edge, [...(byEdge.get(v.edge) ?? []), v]);
for (const [edge, vs] of [...byEdge].sort((a, b) => b[1].length - a[1].length)) {
  const t = vs.filter((v) => v.typeOnly).length;
  console.log(`${edge}  — ${vs.length} edge(s)${t ? `, ${t} type-only` : ""}   [${vs[0].rule}]`);
  for (const v of vs) console.log(`    ${v.from}\n      -> ${v.to}${v.typeOnly ? "   (type-only)" : ""}`);
  console.log();
}
if (violations.length - prod.length) {
  console.log("test-only (not production layering facts):");
  for (const v of violations.filter((x) => x.isTest)) console.log(`    ${v.edge}: ${v.from} -> ${v.to}`);
}
