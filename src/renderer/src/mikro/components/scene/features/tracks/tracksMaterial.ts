/**
 * The track layer's material: three's WebGPU fat line, with a fading tail.
 *
 * WHY A SUBCLASS AND NOT A NEW MATERIAL. A track is a screen-space-width
 * polyline, and getting that right means clip → NDC divide, an aspect
 * correction, a perpendicular offset and endcaps. `Line2NodeMaterial` already
 * does all of it in TSL (`three/src/materials/nodes/Line2NodeMaterial.js:159-310`),
 * it is a plain `NodeMaterial` underneath, and `platform/draw/Line.tsx` already
 * runs it in this scene. Rewriting that expansion to gain a fade would be
 * re-deriving working, load-bearing math.
 *
 * THE TWO HOOKS, both public `NodeMaterial` surface — no `setup()` override, so
 * nothing here couples to three's internal ordering:
 *  - `lineColorNode` supplies the RGB. `Line2NodeMaterial` takes it in place of
 *    its own `materialColor` and finishes with `vec4(lineColorNode, alpha)`,
 *    where `alpha` is its antialiasing/dash coverage (`:431`, `:454`).
 *  - `opacityNode` supplies the fade. `NodeMaterial.setupDiffuseColor` does
 *    `diffuseColor.a *= opacityNode` (`NodeMaterial.js:877-878`), so the tail
 *    MULTIPLIES the edge AA rather than replacing it — a faded line keeps its
 *    smooth edges.
 *
 * THE BLENDING TRAP, and why `transparent` stays false. `platform/draw/Line.tsx`
 * documents that setting `material.transparent` on a `Line2NodeMaterial` makes
 * its setup composite against `viewportOpaqueMipTexture()` — copying the whole
 * drawing buffer and rebuilding its mip chain EVERY FRAME (`:458-462`). So we
 * leave `transparent` false. But the material also sets `blending = NoBlending`
 * in its constructor, and three's WebGPU pipeline only emits a blend state when
 *
 *     material.blending !== NoBlending &&
 *     ( material.blending !== NormalBlending || material.transparent !== false )
 *
 * (`WebGPUPipelineUtils.js:123`). `NormalBlending` with `transparent = false` is
 * three's opaque fast path and would silently NOT blend — the obvious fix is the
 * wrong one. `CustomBlending` passes the second clause on its first term, and
 * `_getBlending` then reads `blendSrc`/`blendDst`/`blendEquation` straight
 * through. That is the one combination giving real alpha without the composite.
 *
 * Do NOT reach for `alphaToCoverage` instead: it is what gives the line its edge
 * AA already, but coverage is quantised to the MSAA sample count — about four
 * levels — so a fade through it reads as stippling.
 */
import * as THREE from "three";
import { Line2NodeMaterial } from "three/webgpu";
import * as TSLTyped from "three/tsl";

/* eslint-disable @typescript-eslint/no-explicit-any */
// three's TSL TypeScript surface lags the runtime API this module needs, the
// same reason `brickNodeMaterials.ts` and `pointsMaterial.ts` give. The node
// GRAPH is typed dynamically; this module's PUBLIC surface — the uniform-node
// record the layer writes to — is hand-typed below.
const TSL = TSLTyped as any;
const { Fn, attribute, clamp, float, max, mix, texture, uniform, vec3 } = TSL;
/* eslint-enable @typescript-eslint/no-explicit-any */

import {
  createMeasureAppearance,
  disposeMeasurePalette,
  identityPaletteTexture,
  measureRampColor,
  setMeasurePalette,
  type MeasureAppearanceNodes,
} from "../../platform/gpu/measurePalette";

/**
 * The uniform nodes the layer component writes to. `any` for the reason the
 * label material gives: a TSL uniform node carries the whole operator surface at
 * runtime, and a `{ value }` type only ever described the slot a setter writes.
 */
export type TrackMaterialNodes = MeasureAppearanceNodes & {
  /** The scene's current timepoint, in the track table's own t units. */
  uCurrentT: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Tail length in those same units. **Zero or less draws every segment.** */
  uTailWindow: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  uOpacity: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  /**
   * The bound palette row, as a TSL texture node. `any` for the same reason the
   * uniforms above are: the node carries the whole operator surface at runtime
   * (`.sample()` among it), and a `{ value }` type describes only the slot
   * `setTrackPalette` writes to. Adopted in place — see `setTrackPalette`.
   */
  palette: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** The 1×1 white fallback, kept so the setter never disposes what it rebinds to. */
  identityPalette: THREE.DataTexture;
};

export type TrackMaterialBundle = {
  material: Line2NodeMaterial;
  nodes: TrackMaterialNodes;
  dispose: () => void;
};

export const createTrackMaterial = (options: {
  lineWidth: number;
  /** True once a colorBy column has been read; false draws the flat colour. */
  colorize: boolean;
}): TrackMaterialBundle => {
  const material = new Line2NodeMaterial();

  // `linewidth`, lowercase — that is the property `materialLineWidth` reads
  // (`MaterialNode.LINE_WIDTH = 'linewidth'`), and the camelCase spelling would
  // be a silently ignored field. `platform/draw/Line.tsx:116` sets the same one.
  material.linewidth = options.lineWidth;
  // Screen-space pixels, which is what `Line2NodeMaterial` implements and also
  // the honest unit: a `lineWidth` in SCENE units is a well-defined length only
  // from SIMILARITY up, which the layer warns about instead of pretending.
  material.worldUnits = false;

  // See the blending note in the module docblock. All four lines are load
  // bearing and none of them is the obvious spelling.
  material.transparent = false;
  material.blending = THREE.CustomBlending;
  material.blendSrc = THREE.SrcAlphaFactor;
  material.blendDst = THREE.OneMinusSrcAlphaFactor;
  material.blendEquation = THREE.AddEquation;
  // Overlay convention: a track composites over the image rather than occluding
  // it, and line topology is never a volume-prepass occluder anyway
  // (`passVisibility.ts` gates on `isMesh`).
  material.depthWrite = false;

  const base = identityPaletteTexture();
  const nodes: TrackMaterialNodes = {
    uCurrentT: uniform(0),
    uTailWindow: uniform(0),
    ...createMeasureAppearance(options.colorize ? 1 : 0),
    uOpacity: uniform(1),
    palette: texture(base),
    identityPalette: base,
  };

  // Per-SEGMENT attributes, one value per instance of the fat-line geometry.
  // `instanceT` is the segment's LATER endpoint time (see `writeRunScalars`),
  // so "has this segment happened" is one comparison.
  const instanceT = attribute("instanceT", "float");
  const instanceValue = attribute("instanceValue", "float");

  material.lineColorNode = Fn(() => {
    const mapped = measureRampColor(instanceValue, nodes, nodes.palette);
    return mix(vec3(1.0, 1.0, 1.0), mapped, nodes.uColorize);
  })();

  material.opacityNode = Fn(() => {
    const age = nodes.uCurrentT.sub(instanceT);
    // Linear falloff across the window, clamped so a segment at exactly
    // `currentT` is solid and one a full window old is gone.
    const faded = clamp(
      float(1.0).sub(age.div(max(nodes.uTailWindow, float(1e-9)))),
      0.0,
      1.0,
    );
    // A segment whose end lies in the FUTURE has not happened yet: hard zero,
    // not a clamp, or scrubbing backwards would leave the whole track lit.
    const arrived = age.greaterThanEqual(0.0).select(faded, float(0.0));
    // A non-positive window is the "no tail" sentinel — an untimed track, or a
    // layer whose tail is switched off. Draw the trajectory whole.
    const tail = nodes.uTailWindow.greaterThan(0.0).select(arrived, float(1.0));
    return tail.mul(nodes.uOpacity);
  })();

  return {
    material,
    nodes,
    dispose: () => {
      disposeMeasurePalette(nodes.palette, base);
      material.dispose();
    },
  };
};

/**
 * Swap the colormap row, ADOPTING ITS BYTES IN PLACE when the size matches —
 * the shared `setMeasurePalette` dance (see `measurePalette.ts` for why the
 * bound texture object must survive under WebGPU). Null is a no-op here: the
 * layer always has SOME colormap and never asks to go back to the identity.
 */
export const setTrackPalette = (
  nodes: TrackMaterialNodes,
  palette: THREE.DataTexture | null,
): void => {
  if (!palette) return;
  setMeasurePalette(nodes.palette, nodes.identityPalette, palette);
};
