import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The chart renderer's import rules, asserted. `ARCHITECTURE.md` states them;
 * this keeps them true.
 *
 * Built under the rules from the start, so there is no ratchet and no sideways
 * allowlist: a shared piece moves DOWN — into `platform/`, or, when elektro's
 * timeline wants it too, into the plot engine (`@/core/data/plot`).
 */

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(ROOT, "../../..");
const ALIAS_PREFIX = "@/mikro/components/chart/";

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
};

const bucketOf = (rel: string): string => {
  const parts = rel.split("/");
  if (parts.length === 1) return "(root)";
  return parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0];
};

const resolveInside = (fromFile: string, spec: string): string | null => {
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

type Edge = { from: string; to: string; fromBucket: string; toBucket: string };
const edges: Edge[] = [];
const specs: { from: string; spec: string }[] = [];
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  for (const m of readFileSync(file, "utf8").matchAll(IMPORT_RE)) {
    specs.push({ from: rel, spec: m[1] });
    const to = resolveInside(file, m[1]);
    if (to) edges.push({ from: rel, to, fromBucket: bucketOf(rel), toBucket: bucketOf(to) });
  }
}

const tier = (bucket: string) => bucket.split("/")[0];
const show = (es: { from: string; to?: string; spec?: string }[]) =>
  es.map((e) => `  ${e.from}\n    -> ${e.to ?? e.spec}`).join("\n");

describe("chart architecture", () => {
  it("finds the import graph", () => {
    // A resolver that silently matched nothing would make every rule pass.
    expect(edges.length).toBeGreaterThan(40);
  });

  it("platform imports nothing from features or shell", () => {
    const bad = edges.filter(
      (e) => tier(e.fromBucket) === "platform" && ["features", "shell"].includes(tier(e.toBucket)),
    );
    expect(bad.length, `platform/ must not know about a feature:\n${show(bad)}`).toBe(0);
  });

  it("features import nothing from shell", () => {
    const bad = edges.filter((e) => tier(e.fromBucket) === "features" && tier(e.toBucket) === "shell");
    expect(bad.length, `shell/ knows features, not the reverse:\n${show(bad)}`).toBe(0);
  });

  it("features do not reach sideways", () => {
    const bad = edges.filter(
      (e) =>
        tier(e.fromBucket) === "features" && tier(e.toBucket) === "features" && e.fromBucket !== e.toBucket,
    );
    expect(bad.length, `move the shared piece into platform/:\n${show(bad)}`).toBe(0);
  });

  it("platform/model is a leaf", () => {
    const bad = edges.filter((e) => e.fromBucket === "platform/model" && e.toBucket !== "platform/model");
    expect(bad.length, `the vocabulary must depend on nothing above it:\n${show(bad)}`).toBe(0);
  });

  it("shell is imported only by Chart.tsx", () => {
    const bad = edges.filter(
      (e) => tier(e.toBucket) === "shell" && tier(e.fromBucket) !== "shell" && e.from !== "Chart.tsx",
    );
    expect(bad.length, `only the public API may reach into shell/:\n${show(bad)}`).toBe(0);
  });

  it("builds on the plot engine, never on elektro or the scene's internals", () => {
    const bad = specs.filter(
      (e) => e.spec.startsWith("@/elektro/") || e.spec.startsWith("@/mikro/components/scene/"),
    );
    expect(
      bad.length,
      `what a chart shares with the timeline or the scene lives in @/core or @/mikro/lib:\n${show(bad)}`,
    ).toBe(0);
  });

  it("is reached from outside only through its public API", () => {
    const bad: { from: string; spec: string }[] = [];
    for (const file of walk(SRC)) {
      if (file.startsWith(ROOT)) continue;
      for (const m of readFileSync(file, "utf8").matchAll(IMPORT_RE)) {
        const spec = m[1];
        const inside =
          spec.includes("components/chart/") &&
          (spec.startsWith("@/mikro/") || resolve(dirname(file), spec).startsWith(ROOT));
        if (inside && !/components\/chart\/Chart$/.test(spec)) {
          bad.push({ from: relative(SRC, file), spec });
        }
      }
    }
    expect(bad.length, `a host renders \`Chart\`, nothing else:\n${show(bad)}`).toBe(0);
  });
});
