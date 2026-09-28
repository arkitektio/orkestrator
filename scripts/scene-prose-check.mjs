#!/usr/bin/env node
/**
 * Assert every prose path reference resolves to a real file.
 *
 * Stronger than "the rewriter had nothing left to say": a rewrite can succeed
 * and still be wrong (a directory whose children fanned out collapses to a
 * common prefix that exists nowhere). This checks the only thing that matters —
 * does the file exist.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src/renderer/src");
const SCENE = join(SRC, "mikro/components/scene");

/** Paths that intentionally name something that no longer exists. */
const HISTORICAL = [
  /volume-math/, /chunkPlanning/, /chunkPlanTracker/, /volumeTexture/,
  /\bcore\/slab\.ts/, /layerListLayout/, /ChunkPlane/, /render\/final/,
  // Planned, not yet written — tracked in RESTRUCTURE.md.
  /IsoThresholdPanel/, /features\/points/, /features\/volume\/shading/,
  /architecture\.test\.ts/, /cardRegistry/, /debugRegistry/, /sceneScope/,
  /voxelFrame/,
];

const walk = (d, out = []) => {
  for (const e of readdirSync(d)) {
    if (e === "node_modules" || e === "__fixtures__") continue;
    const f = join(d, e);
    statSync(f).isDirectory() ? walk(f, out) : /\.(tsx?|md)$/.test(e) && out.push(f);
  }
  return out;
};

// A path-shaped token ending in .ts/.tsx, or a backticked dir ending in /
const TOKEN = /`([A-Za-z0-9_@/.{}, -]+?\.tsx?)`|(?<![\w/.-])((?:features|platform|shell)\/[A-Za-z0-9_/-]+\.tsx?)/g;
/** Every real file, indexed by basename — a bare `foo.ts` in prose is a name, not a path. */
const byBase = new Map();
const walkAll = (d, out = []) => {
  for (const e of readdirSync(d)) {
    if (e === "node_modules") continue;
    const f = join(d, e);
    statSync(f).isDirectory() ? walkAll(f, out) : out.push(f);
  }
  return out;
};
const ALL = [...walkAll(SRC), ...walkAll(ROOT).filter((f) => !f.includes("/node_modules/") && !f.includes("/out/") && !f.includes("/dist/"))];
for (const f of ALL) byBase.set(f.split("/").pop(), true);
/** A prose path may be a suffix of the real one ("attributes/columnLut.ts"). */
const isSuffix = (tok) => ALL.some((f) => f.endsWith("/" + tok));

const bad = [];
for (const abs of walk(SCENE)) {
  const rel = relative(SCENE, abs);
  const src = readFileSync(abs, "utf8");
  for (const m of src.matchAll(TOKEN)) {
    let tok = (m[1] ?? m[2]).trim();
    if (tok.includes("{") || tok.includes(",")) continue;
    if (tok.startsWith(".")) continue;   // a bare `.test.ts` suffix mention   // brace expansions checked below
    if (HISTORICAL.some((r) => r.test(tok))) continue;
    if (tok.startsWith("@/")) { if (!existsSync(join(SRC, tok.slice(2)))) bad.push([rel, tok]); continue; }
    // A bare filename is a prose mention ("see `brickResidency.ts`"), not a path.
    if (!tok.includes("/")) { if (!byBase.has(tok)) bad.push([rel, tok]); continue; }
    const cands = [join(SCENE, tok), join(SRC, tok), join(ROOT, tok), join(dirname(abs), tok)];
    if (!cands.some((c) => existsSync(c)) && !isSuffix(tok)) bad.push([rel, tok]);
  }
  // Brace expansions: `dir/{a, b, c}.ts`
  for (const m of src.matchAll(/`([A-Za-z0-9_/-]+)\/\{([^}]+)\}(\.tsx?)`/g)) {
    for (const name of m[2].split(",").map((s) => s.trim())) {
      const p = join(SCENE, m[1], name + m[3]);
      if (!existsSync(p) && !HISTORICAL.some((r) => r.test(name))) bad.push([rel, `${m[1]}/{…${name}}${m[3]}`]);
    }
  }
}
const byFile = new Map();
for (const [f, t] of bad) byFile.set(f, [...(byFile.get(f) ?? []), t]);
console.log(`${bad.length} prose reference(s) point at a file that does not exist\n`);
for (const [f, ts] of [...byFile].sort((a, b) => b[1].length - a[1].length))
  console.log(`  ${f}\n${[...new Set(ts)].map((t) => "      " + t).join("\n")}`);
process.exit(bad.length ? 1 : 0);
