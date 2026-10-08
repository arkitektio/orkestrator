import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The plot engine's import rules, asserted.
 *
 * `core/data/plot` is what elektro's experiment timeline and mikro's chart are
 * both built on: the stores, the camera, the level and tile planning, the packed
 * lines, the chrome. It was promoted out of elektro so that neither module has
 * to import the other, and it stays shareable only while it knows nothing about
 * either:
 *
 *  - no module code, no `@/app`, no generated GraphQL — what a layer IS is the
 *    module's, handed in (a registry, a `rowOf`, a `write`);
 *  - the vocabulary (`model/`, `coords/`) and the planning (`quality/`,
 *    `sources/`) are free of React, so they run in node tests.
 */

const ROOT = dirname(fileURLToPath(import.meta.url));

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
};

// Wide bound: a long named-import list must not silently stop being an edge.
const IMPORT_RE = /(?:^|\n)\s*(?:import|export)[\s\S]{0,2000}?from\s+["']([^"']+)["']/g;

type Edge = { from: string; spec: string };
const edges: Edge[] = [];
for (const file of walk(ROOT)) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(IMPORT_RE)) edges.push({ from: relative(ROOT, file), spec: m[1] });
}

const show = (es: Edge[]) => es.map((e) => `  ${e.from}\n    -> ${e.spec}`).join("\n");
const REACT = /^(react|react-dom|react-router-dom|@react-three\/.*|zustand)$/;

describe("plot engine architecture", () => {
  it("finds the import graph", () => {
    // A scan that silently matched nothing would make every rule pass.
    expect(edges.length).toBeGreaterThan(100);
  });

  it("imports only core", () => {
    const bad = edges.filter((e) => e.spec.startsWith("@/") && !e.spec.startsWith("@/core/"));
    expect(bad.length, `the engine must not know a module or the app:\n${show(bad)}`).toBe(0);
  });

  it("imports no generated GraphQL", () => {
    const bad = edges.filter((e) => /\/api\/(graphql|funcs|fragments)$/.test(e.spec));
    expect(bad.length, `layers arrive structurally typed, never as fragments:\n${show(bad)}`).toBe(0);
  });

  it("keeps the vocabulary and the planning free of React", () => {
    const bad = edges.filter(
      (e) => /^(model|coords|quality|sources)\//.test(e.from) && REACT.test(e.spec),
    );
    expect(bad.length, `these run in node tests:\n${show(bad)}`).toBe(0);
  });

  it("keeps the vocabulary a leaf", () => {
    const bad = edges.filter(
      (e) =>
        /^(model|coords)\//.test(e.from) &&
        e.spec.startsWith(".") &&
        /\/(stores|drivers|camera|chrome|lines|layout|layerui|layers|scope|marks)\//.test(
          `/${join(dirname(e.from), e.spec)}/`,
        ),
    );
    expect(bad.length, `model/ and coords/ depend on nothing above them:\n${show(bad)}`).toBe(0);
  });
});
