import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every zarrita open in the renderer must pin the version (`open.v3`).
 *
 * The app only reads zarr v3 stores, but zarrita's auto-detecting `open()`
 * breaks its per-store version tie as v2 on a fresh store, so it requests
 * `.zattrs` and `.zarray` (two 404s) before trying `zarr.json`. This test
 * fails on any new bare `open(` call in a file that imports `open` from
 * "zarrita".
 */

const RENDERER_SRC = join(__dirname, "..", "..");

const collectSources = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectSources(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
};

const importsZarritaOpen = (source: string) =>
  /import\s*\{[^}]*\bopen\b[^}]*\}\s*from\s*["']zarrita["']/.test(source);

/** Blank out comments, keeping line count (so reported lines stay right). */
const stripComments = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (line, lead: string) => lead + " ".repeat(line.length - lead.length));

/** Bare `open(` calls: not `open.v3(` / `open.v2(`, not `.open(`, not `openX(`. */
const bareOpenCalls = (source: string) => {
  const code = stripComments(source);
  const matches: number[] = [];
  const pattern = /(?<![.\w$])open\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(code)) !== null) {
    matches.push(code.slice(0, match.index).split("\n").length);
  }
  return matches;
};

describe("zarrita opens pin the store version", () => {
  it("has no bare open() call in files importing open from zarrita", () => {
    const offenders: string[] = [];
    for (const file of collectSources(RENDERER_SRC)) {
      const source = readFileSync(file, "utf8");
      if (!importsZarritaOpen(source)) continue;
      for (const line of bareOpenCalls(source)) {
        offenders.push(`${relative(RENDERER_SRC, file)}:${line} — use open.v3(...)`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("detects a bare call (self-check)", () => {
    expect(bareOpenCalls('await open(loc, { kind: "array" });')).toEqual([1]);
    expect(bareOpenCalls("await open.v3(loc);\nstore.open(x);\nreopen(y);")).toEqual([]);
    expect(bareOpenCalls("// never bare open() here\n/* open(x) */\nopen.v3(loc);")).toEqual([]);
    expect(bareOpenCalls("const url = 'http://x'; // open()\nopen(loc);")).toEqual([2]);
  });
});
