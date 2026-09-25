/**
 * The registration workspace composes OVER the scene; it is not part of it.
 *
 * The scene's own `architecture.test.ts` polices imports INSIDE `scene/` and
 * cannot see a folder outside it, so the other half of the contract is held
 * here: nothing under `registration/` may reach past the scene's two public
 * entries — `Scene.tsx` (what a host renders) and `sceneHost.ts` (what a host
 * may do and know). An import of `scene/platform/…`, `scene/features/…` or
 * `scene/shell/…` is how a workflow quietly turns back into a scene feature,
 * and the separation was the point (scene/ARCHITECTURE.md "Workflows live
 * outside").
 *
 * The second rule keeps the math honest: `math/` and `store/` must stay free of
 * React, three.js and generated GraphQL, which is what lets their suites run in
 * `node` — and what makes them the part of this workspace that can be trusted
 * without running the app.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SCENE = resolve(ROOT, "../scene");
const PUBLIC_SCENE_ENTRIES = new Set([join(SCENE, "Scene"), join(SCENE, "sceneHost")]);

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });

const importsOf = (file: string): string[] =>
  [...readFileSync(file, "utf8").matchAll(/(?:from|import)\s+["']([^"']+)["']/g)].map((match) => match[1]);

const resolveSpecifier = (file: string, specifier: string): string | null => {
  if (specifier.startsWith(".")) return resolve(dirname(file), specifier);
  if (specifier.startsWith("@/")) return resolve(ROOT, "../../..", specifier.slice(2));
  return null;
};

const files = sourceFiles(ROOT);

describe("registration workspace import boundary", () => {
  it("reaches the scene only through Scene.tsx and sceneHost.ts", () => {
    const offenders = files.flatMap((file) =>
      importsOf(file).flatMap((specifier) => {
        const target = resolveSpecifier(file, specifier);
        if (!target || !(target === SCENE || target.startsWith(`${SCENE}/`))) return [];
        return PUBLIC_SCENE_ENTRIES.has(target) ? [] : [`${relative(ROOT, file)} → ${specifier}`];
      }),
    );
    expect(offenders).toEqual([]);
  });

  it("keeps math/ and store logic free of React, three.js and generated GraphQL", () => {
    const pure = files.filter(
      (file) =>
        !file.endsWith(".test.ts") &&
        (file.startsWith(join(ROOT, "math")) ||
          (file.startsWith(join(ROOT, "store")) && !file.endsWith("context.tsx"))),
    );
    expect(pure.length).toBeGreaterThan(5);
    const offenders = pure.flatMap((file) =>
      importsOf(file)
        .filter(
          (specifier) =>
            /^(react|three|zustand$|@react-three\/|@apollo\/)/.test(specifier) ||
            /api\/graphql$/.test(specifier),
        )
        .map((specifier) => `${relative(ROOT, file)} → ${specifier}`),
    );
    expect(offenders).toEqual([]);
  });
});
