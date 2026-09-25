import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { EDGE_ALLOWLIST } from "./moduleBoundaries.allowlist";

/**
 * The module border, as data the boundary test (and nothing else) reads.
 *
 * A module is a service namespace; its code lives under its roots (the module
 * folder plus its `lib/<namespace>` client wrappers). Everything outside every
 * root is the host. An EDGE is "some file in A imports something in B"; the
 * test fails on every edge that is not in `moduleBoundaries.allowlist.ts`.
 *
 * `datalayer` is deliberately NOT a module: it has no models or surfaces, only
 * the generic S3 primitives every module uploads and resolves through. Each
 * module requests its grants from its own service (`<module>/datalayer/`).
 */
export const MODULE_ROOTS: Record<string, readonly string[]> = {
  alpaka: ["alpaka", "lib/alpaka"],
  dokuments: ["dokuments", "lib/dokuments"],
  elektro: ["elektro", "lib/elektro"],
  fluss: ["fluss", "lib/fluss"],
  kabinet: ["kabinet", "lib/kabinet"],
  kraph: ["kraph", "lib/kraph"],
  lok: ["lok", "lib/lok"],
  lovekit: ["lovekit", "lib/lovekit"],
  mikro: ["mikro", "lib/mikro"],
  omeroark: ["omeroark", "lib/omeroark"],
  rekuest: ["rekuest", "lib/rekuest"],
};

const ROOTS = Object.entries(MODULE_ROOTS)
  .flatMap(([module, roots]) => roots.map((root) => ({ module, root })))
  // Longest first, so `lib/mikro` is never swallowed by a shorter root.
  .sort((a, b) => b.root.length - a.root.length);

/**
 * The owner of a source-relative path: a module namespace, or `host:<area>`
 * where area is the top folder (`host:app`, `host:components`) or, under
 * `lib/`, the lib package (`host:lib/export`).
 */
export const ownerOf = (path: string): string => {
  for (const { module, root } of ROOTS) {
    if (path === root || path.startsWith(`${root}/`)) return module;
  }
  const parts = path.split("/");
  if (parts.length === 1) return "host:root";
  if (parts[0] === "lib") return parts.length === 2 ? "host:lib" : `host:lib/${parts[1]}`;
  return `host:${parts[0]}`;
};

const isModule = (owner: string): boolean => !owner.startsWith("host:");

const stripComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/** Every module specifier a file imports, re-exports or dynamically imports. */
export const importSpecifiers = (text: string): string[] => {
  const out: string[] = [];
  const pattern = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;
  for (const match of stripComments(text).matchAll(pattern)) out.push(match[1]);
  return out;
};

/** A specifier as a source-relative path, or null for packages. */
export const resolveSpecifier = (
  fromRel: string,
  specifier: string,
): string | null => {
  if (specifier.startsWith("@/")) return specifier.slice(2);
  if (specifier.startsWith(".")) {
    return join(dirname(fromRel), specifier).split("\\").join("/");
  }
  return null;
};

const sourceFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
};

/** `"from -> to"` for an edge between two owners. */
export const edgeKey = (from: string, to: string): string => `${from} -> ${to}`;

/**
 * Every edge INTO a module from outside it (another module or the host), with
 * the files that make it. A module leaning on the host (`@/components/ui`,
 * `@/app/Arkitekt`) is what the host is for, so module -> host is left out,
 * and host -> host is not the border's business.
 */
export const collectEdges = (srcRoot: string): Map<string, string[]> => {
  const edges = new Map<string, string[]>();
  for (const file of sourceFiles(srcRoot)) {
    const rel = relative(srcRoot, file).split("\\").join("/");
    const from = ownerOf(rel);
    const text = readFileSync(file, "utf8");
    for (const specifier of importSpecifiers(text)) {
      const target = resolveSpecifier(rel, specifier);
      if (target === null) continue;
      const to = ownerOf(target);
      if (from === to || !isModule(to)) continue;
      const key = edgeKey(from, to);
      const files = edges.get(key) ?? [];
      if (!files.includes(rel)) files.push(rel);
      edges.set(key, files);
    }
  }
  return edges;
};

// __dirname is src/renderer/src/app.
const SRC_ROOT = resolve(__dirname, "..");

describe("the boundary parser", () => {
  it("reads static, re-export, side-effect and dynamic imports", () => {
    const text = [
      'import { a } from "@/kraph/api/graphql";',
      'export { b } from "../lok/x";',
      'import "@/mikro/side";',
      'const c = () => import("@/rekuest/lazy");',
      '// import { gone } from "@/alpaka/commented";',
    ].join("\n");
    expect(importSpecifiers(text)).toEqual([
      "@/kraph/api/graphql",
      "../lok/x",
      "@/mikro/side",
      "@/rekuest/lazy",
    ]);
  });

  it("owns paths by their longest root", () => {
    expect(ownerOf("lib/mikro/funcs.tsx")).toBe("mikro");
    expect(ownerOf("mikro/pages/ImagePage.tsx")).toBe("mikro");
    expect(ownerOf("lib/export/fileDownloaders.ts")).toBe("host:lib/export");
    expect(ownerOf("app/dialog.tsx")).toBe("host:app");
    expect(ownerOf("linkers.tsx")).toBe("host:root");
  });

  it("resolves relative specifiers that escape a module", () => {
    const target = resolveSpecifier("providers/smart/extensions/alpaka/useTalkAbout.ts", "../../../../alpaka/api/graphql");
    expect(target).toBe("alpaka/api/graphql");
    expect(resolveSpecifier("kraph/x.ts", "react")).toBeNull();
  });
});

describe("module boundaries", () => {
  const edges = collectEdges(SRC_ROOT);

  it("scans the renderer (a guard that scans nothing passes forever)", () => {
    expect(edges.size).toBeGreaterThan(5);
  });

  it("only crosses into a module along an allowlisted edge", () => {
    const offenders = [...edges.entries()]
      .filter(([key]) => !(key in EDGE_ALLOWLIST))
      .map(([key, files]) => `${key}: ${files.join(", ")}`);
    expect(offenders).toEqual([]);
  });

  it("keeps the allowlist honest (every entry is still a real edge)", () => {
    const stale = Object.keys(EDGE_ALLOWLIST).filter((key) => !edges.has(key));
    expect(stale).toEqual([]);
  });
});
