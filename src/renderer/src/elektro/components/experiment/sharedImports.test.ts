import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * elektro must not reach into mikro's internals.
 *
 * The experiment renderer is built from the same doctrine as mikro's scene, and
 * several of its pure modules are literally the same code — but they were
 * PROMOTED to `@/lib/scene/*` so both modules import a shared thing, rather than
 * elektro importing mikro's guts.
 *
 * Without this test that distinction decays on the first hurried afternoon:
 * `@/mikro/components/scene/platform/...` resolves perfectly well, and
 * mikro's own `architecture.test.ts` cannot see it — its `resolveTarget` returns
 * null for anything outside the scene directory, so it is structurally blind to
 * inbound edges. This is the other half of that fence.
 *
 * If you need something of mikro's: promote it to `@/lib/scene/` (and move it, so
 * there is one copy), do not import it from here.
 */

// __dirname is elektro/components/experiment.
const ELEKTRO_ROOT = resolve(__dirname, "../..");
const SRC_ROOT = resolve(ELEKTRO_ROOT, "..");

const sourceFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
};

/** `from "..."` / `import("...")` specifiers, ignoring anything in a comment. */
const specifiersIn = (text: string): string[] => {
  const stripped = text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  return [...stripped.matchAll(/(?:from\s*|import\(\s*)["']([^"']+)["']/g)].map(
    (m) => m[1],
  );
};

describe("elektro module boundaries", () => {
  it("never imports from mikro-next", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(ELEKTRO_ROOT)) {
      for (const spec of specifiersIn(readFileSync(file, "utf8"))) {
        const isAliased = spec.startsWith("@/mikro/");
        const isRelative =
          spec.startsWith(".") &&
          resolve(file, "..", spec).startsWith(join(SRC_ROOT, "mikro"));
        if (isAliased || isRelative) {
          offenders.push(`${relative(SRC_ROOT, file)} -> ${spec}`);
        }
      }
    }

    expect(
      offenders,
      "elektro must not import mikro-next internals. Promote the module to " +
        "`@/lib/scene/` (moving it, so there is exactly one copy) instead.",
    ).toEqual([]);
  });

  it("is actually scanning the elektro tree", () => {
    // A guard whose glob silently matches nothing passes forever.
    expect(sourceFiles(ELEKTRO_ROOT).length).toBeGreaterThan(50);
  });
});
