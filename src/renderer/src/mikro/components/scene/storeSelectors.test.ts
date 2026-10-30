import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * P17/P9c, asserted: React components subscribe to SCALARS, never to the
 * store's layer arrays.
 *
 * `sceneStore.updateLayer` republishes `layers` (and `patchSceneLayer`
 * republishes `sceneLayers`) with a fresh array identity on EVERY edit — a
 * contrast-window drag does it sixty times a second. A component that
 * subscribes to the array re-renders per tick no matter how cheap its own
 * work is, and one such subscriber high in the tree (LayerRenderer, before
 * it was converted) re-rendered the whole 3D dispatch subtree. The
 * alternatives are all in-tree: a selector returning the derived scalar, or
 * a joined string key (`layersPlanKey`, `identityOf`) plus a `getState()`
 * read inside the memo the key guards — see `shell/LayerRenderer.tsx` and
 * `platform/model/layerPlanKey.ts`.
 *
 * The allowlist is a CEILING, not a licence, exactly like
 * `architecture.test.ts`'s KNOWN_SIDEWAYS: removing an entry when its
 * subscription is converted is expected; adding one needs a reason written
 * next to it.
 */

const SCENE = dirname(fileURLToPath(import.meta.url));

/**
 * Whole-array subscriptions that exist today, each with its reason:
 *  - LayerControlPanel: the layer cards PREVIEW live values (a clim drag must
 *    move the card's own sliders), and every card is memo'd with stable
 *    handlers, so only the edited card actually re-renders.
 *  - MeshesPanel: subscribes to `sceneLayers`, which
 *    churns on `patchSceneLayer` (card-cadence edits), never on a brick
 *    layer's contrast drag.
 */
const KNOWN_WHOLE_ARRAY = new Set([
  "shell/layerPanel/LayerControlPanel.tsx",
  "features/meshes/MeshesPanel.tsx",
]);

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "__fixtures__") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
};

/** `useSceneStore((s) => s.layers)` / `s.sceneLayers` — the selector RETURNS
 * the array. A selector that merely reads the array to derive a scalar
 * (`(s) => sceneZExtent(s.layers)?.step`) does not match, and must not: the
 * derived value is what the component re-renders on. */
const WHOLE_ARRAY_SELECTOR =
  /useSceneStore\(\s*\((\w+)\)\s*=>\s*\1\.(layers|sceneLayers)\s*,?\s*\)/g;

describe("scene store selectors", () => {
  it("no component outside the allowlist subscribes to a whole layer array", () => {
    const offenders: string[] = [];
    for (const file of walk(SCENE)) {
      const rel = relative(SCENE, file);
      if (/\.(test|spec)\.tsx?$/.test(rel)) continue;
      const src = readFileSync(file, "utf8");
      if (src.match(WHOLE_ARRAY_SELECTOR) && !KNOWN_WHOLE_ARRAY.has(rel)) {
        offenders.push(rel);
      }
    }
    expect(
      offenders,
      "these files subscribe to s.layers / s.sceneLayers wholesale — subscribe to a scalar " +
        "or a joined key + getState() memo instead (see LayerRenderer.tsx / layerPlanKey.ts), " +
        "or add an allowlist entry WITH a reason",
    ).toEqual([]);
  });

  it("the allowlist is a ceiling — remove entries whose subscription is gone", () => {
    for (const rel of KNOWN_WHOLE_ARRAY) {
      const src = readFileSync(join(SCENE, rel), "utf8");
      expect(
        src.match(WHOLE_ARRAY_SELECTOR),
        `${rel} no longer subscribes to a whole layer array — remove its allowlist entry`,
      ).not.toBeNull();
    }
  });
});

/**
 * P33, asserted: a layout effect under `scene/` exists to write drawn objects,
 * so it goes through `useDrawEffect`, which asks for the frame that shows the
 * write. A ceiling, like the list above. Each existing entry, with its reason:
 *  - InitialCameraFit: moves the camera before the first paint, and asks for
 *    its own frame only when it actually fitted.
 *  - TracksLayer: asks for its own frame, past an early return that must not
 *    draw for an empty geometry.
 */
const KNOWN_LAYOUT_EFFECTS = new Set([
  "platform/camera/InitialCameraFit.tsx",
  "features/tracks/TracksLayer.tsx",
]);

describe("scene layout effects", () => {
  const usesLayoutEffect = (src: string) => /\buseLayoutEffect\(/.test(src);

  it("no component outside the allowlist writes in a raw layout effect", () => {
    const offenders = walk(SCENE)
      .map((file) => relative(SCENE, file))
      .filter((rel) => !/\.(test|spec)\.tsx?$/.test(rel))
      .filter((rel) => usesLayoutEffect(readFileSync(join(SCENE, rel), "utf8")))
      .filter((rel) => !KNOWN_LAYOUT_EFFECTS.has(rel));
    expect(
      offenders,
      "these files write in a raw useLayoutEffect, which requests no frame on a demand " +
        "canvas — use useDrawEffect (core/data/scene/stores), or add an allowlist entry WITH a reason",
    ).toEqual([]);
  });

  it("the allowlist is a ceiling — remove entries whose layout effect is gone", () => {
    for (const rel of KNOWN_LAYOUT_EFFECTS) {
      expect(
        usesLayoutEffect(readFileSync(join(SCENE, rel), "utf8")),
        `${rel} no longer has a useLayoutEffect — remove its allowlist entry`,
      ).toBe(true);
    }
  });
});
