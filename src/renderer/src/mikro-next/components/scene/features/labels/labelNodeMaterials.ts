import * as THREE from "three";
import { NodeMaterial } from "three/webgpu";
import * as TSLTyped from "three/tsl";

import type { LayerBrickPool } from "../bricks/residency/brickResidency";
import { GOLDEN_RATIO_CONJUGATE } from "../../platform/gpu/instanceColormaps";
import {
  identityPaletteTexture,
  setMeasurePalette,
} from "../../platform/gpu/measurePalette";
import { emitValueLutColor, identityValueLutTexture } from "../../platform/gpu/valueLutNodes";
import {
  emitResolveBrickResidency,
  makeTraversalNodes,
  texture3DLoad,
  type ResolvedResidency,
  type TraversalNodesPublic,
  type UniformNodeLike,
} from "../bricks/gpu/brickNodeMaterials";
import {
  emitVolumeRayBounds,
  makeVolumeRayNodes,
  makeVolumeRayUniforms,
  MAX_RAY_STEPS,
} from "../bricks/gpu/volumeRayNodes";
import type { LabelUniformData } from "./labelUniforms";

// Same dynamic-typing bargain as `brickNodeMaterials.ts`: three's TSL TypeScript
// surface lags the runtime API (int/ivec3 uniforms, node-valued Loop bounds,
// method chaining on swizzles). The node GRAPH is typed dynamically; the uniform
// records the layer components write to are hand-typed below.
/* eslint-disable @typescript-eslint/no-explicit-any */
const TSL = TSLTyped as any;
const {
  Break,
  Continue,
  Discard,
  Fn,
  If,
  Loop,
  bool,
  float,
  floor,
  fract,
  int,
  ivec2,
  ivec3,
  length,
  max,
  texture,
  textureLoad,
  uniform,
  uv,
  vec3,
  vec4,
} = TSL;

/**
 * The label mask's material: raw object ids in, a colour per object out.
 *
 * A SIBLING of `brickNodeMaterials.ts` rather than a third factory inside it.
 * That module is wall-to-wall channel compositor — `makeChannelNodes`,
 * `chParamsA/B`, the colormap atlas, `makeChannelNormalize`, `makePhasorValue`,
 * `makeCursorHit` — and a label uses none of it. What IS shared is imported:
 * `makeTraversalNodes` and `emitResolveBrickResidency` are the level walk, and
 * they must stay in lockstep with the CPU mirror in `brickResidency`, so there
 * is exactly one copy.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO, each for a stated reason:
 *
 *  - **No `channelNormalize`.** That is the bug the old stub documented: an
 *    int32 id normalized against the dtype range `[-2^31, 2^31)` lands every id
 *    within ~2e-5 of 0.5, painting the whole mask one flat colour. The raw
 *    sample IS the answer here.
 *  - **No clim, gamma or invert.** A contrast curve over object ids is
 *    meaningless.
 *  - **No colormap.** A ramp would impose an order ids do not have; they hash to
 *    distinct hues instead (or take a `colorBys` entry's colour, which arrives
 *    with the LUT).
 *  - **No tricubic / zoom-smoothing tap.** An interpolated id is a *different
 *    object* — a smoothed boundary between ids 4 and 91 reads as id 47.
 *  - **No `AdditiveBlending`.** `commonMaterialSettings` forces it, and a mask
 *    added over an image washes both out. A label composites normally, with real
 *    alpha, which is why it configures its material itself.
 */

/** Public shape of the label material's own uniform nodes. */
export type LabelMaterialNodes = TraversalNodesPublic & {
  uDesiredLevel: UniformNodeLike<number>;
  uSlabBaseZ: UniformNodeLike<number>;
  uBaseShape: UniformNodeLike<THREE.Vector3>;
  uSeed: UniformNodeLike<number>;
  uBackground: UniformNodeLike<number>;
  uOpacity: UniformNodeLike<number>;
  uSaturation: UniformNodeLike<number>;
  uValue: UniformNodeLike<number>;
  /** 1 = draw only object BOUNDARIES; 0 = fill. 2D only. */
  uContour: UniformNodeLike<number>;
  /** Boundary width, in BASE voxels. */
  uContourWidth: UniformNodeLike<number>;
  /** 1 = the LUT's rgb REPLACES the hue hash; 0 = hash it. */
  uLutColorize: UniformNodeLike<number>;
  /** 1 = the LUT's alpha may discard the fragment; 0 = ignore it. */
  uLutFilter: UniformNodeLike<number>;
  /** Subtract from an id to get its LUT slot (`labelColorLut`'s `idOffset`). */
  uLutIdOffset: UniformNodeLike<number>;
  uLutWidth: UniformNodeLike<number>;
  uLutHeight: UniformNodeLike<number>;
  /** The range the codes were quantised over, at build time. */
  uLutValueMin: UniformNodeLike<number>;
  uLutValueMax: UniformNodeLike<number>;
  /** The window the user is looking through. Live — moving it is not a rebuild. */
  uLutClimMin: UniformNodeLike<number>;
  uLutClimMax: UniformNodeLike<number>;
};

export type LabelMaterialBundle = { material: NodeMaterial; nodes: LabelMaterialNodes };

/**
 * A 1x1 "visible, no value" LUT — the identity, bound from the start.
 *
 * Always having a texture bound is deliberate: swapping a texture is a uniform
 * write, whereas adding one to the graph later would be a recompile. The code is
 * `CODE_NO_VALUE`, which means "leave the hue hash alone and hide nothing", so a
 * mask with no colouring renders identically whether the real LUT has arrived
 * or not.
 *
 * It must share the real table's FORMAT as well as its meaning: the LUT is RG8
 * now, and rebinding an RGBA8 placeholder when a colouring is switched off would
 * be a format mismatch on every switch-off.
 *
 * (This also makes the old docstring true for the first time. It claimed an
 * uncovered id "keeps the identity texel and therefore its hue hash"; with a
 * white RGBA texel and `uLutColorize = 1`, `mix(hashed, vec3(1), 1)` is white,
 * so uncovered ids actually rendered WHITE. The sentinel zeroes the mix instead.)
 */
/**
 * A 1x1 white palette — bound from the start for the same reason the identity
 * LUT is: the sampler must exist in the graph before any colouring arrives, or
 * binding one later is a recompile.
 *
 * White rather than a real ramp because `uLutColorize` is 0 until a colouring
 * lands, so nothing samples it; and if anything did, white is the identity the
 * old RGBA table used.
 */
const createIdentityPalette = identityPaletteTexture;

/** The shared RG8 decode — one implementation for masks and meshes; see
 *  `platform/gpu/valueLutNodes.ts` for the contract it enforces. */
const emitLutColor = emitValueLutColor;

/**
 * The raw object id at a RESOLVED position, or −1 where nothing is resident.
 *
 * The whole reason this module exists, and the one place precision matters.
 * `round` (via `floor(x + 0.5)`) is not cosmetic: on an `r8` atlas the sample
 * comes back as `k/255` and `uAtlasScale` is 255, so `k/255*255` is only
 * approximately `k` — 6.99999 for 7. Every downstream comparison is an integer
 * identity test (`== background`, the hue hash, a LUT slot index, a contour's
 * neighbour test), and all of them break silently on that.
 *
 * `texture3DLoad` (an unfiltered fetch at an integer texel) rather than
 * `texture3D`: in 3D the pool's atlas is allocated with LINEAR filtering because
 * `spec.border` is 1, and a linear tap between two ids returns an id that is
 * neither. `floor(texel)` is the correct integer index — texel centres sit at
 * half-integers, which the tricubic path in the image material pins.
 *
 * −1 for "nothing resident" rather than 0 or the background: it has to be a value
 * no real id can take, so a streaming-in region reads as ABSENT rather than as an
 * object. For the contour that is the difference between no outline and an
 * outline drawn around the whole loading frontier.
 *
 * `named` keeps each call's vars distinct — `emitResolveBrickResidency` declares
 * named vars and TSL inlines bodies into one scope, which is the silent-shadowing
 * mechanism this module's sibling has been bitten by before.
 */
const emitDecodeId = (t: any, resolved: ResolvedResidency, named: string): any => {
  const id = float(0.0).toVar(`${named}Id`);
  If(resolved.status.lessThan(0.5), () => {
    id.assign(-1.0);
  })
    .ElseIf(resolved.status.greaterThan(1.5), () => {
      // EMPTY (uniform) brick: the value rode in the page entry, already decoded
      // 24-bit-exact for a label pool (see `EmptyValueBits`). A mask is MOSTLY
      // uniform bricks, so this is the common branch, not the rare one.
      id.assign(floor(resolved.emptyValue.add(0.5)));
    })
    .Else(() => {
      const tap = texture3DLoad(t.brickAtlas, ivec3(floor(resolved.texelBase)));
      id.assign(floor(tap.r.mul(t.uAtlasScale).add(0.5)));
    });
  return id;
};

/**
 * The id at an arbitrary base-voxel position — a FULL residency resolve plus a
 * tap, which is what one neighbour sample costs.
 *
 * Not a cheap offset on the centre's texel: a neighbour one voxel away may live
 * in a different brick, at a different level, or in a brick that is not resident
 * at all, and reading past a slot's border would sample another object's data (or
 * another channel's slab). The level walk is the only correct answer.
 */
const emitIdAt = (t: any, baseVoxel: any, desiredLevel: any, named: string): any =>
  emitDecodeId(
    t,
    // `name` threads the per-call prefix into the resolver's own vars — the
    // contour emits one FULL resolve per neighbour, and unprefixed emissions
    // collided on the default `res*` names (a TSL rename warning per var per
    // neighbour, drowning out the real-shadowing signal those names guard).
    emitResolveBrickResidency(t, baseVoxel, desiredLevel, { slabZ: true, name: named }),
    named,
  );

/**
 * Object id → a hue, the same golden-ratio scatter the fabriks instance palette
 * uses (`instanceHue`), so consecutive ids land far apart on the wheel. `uSeed`
 * shifts the whole sequence — that is what `LabelRender.seed` is for.
 *
 * HSV→RGB inline at S/V fixed by the uniforms: a full colour-space helper would
 * be more machinery than one hue ramp needs.
 */
const emitHueColor = (hue: any, saturation: any, value: any): any => {
  const h = fract(hue).mul(6.0).toVar("lblH");
  const c = float(value).mul(saturation).toVar("lblC");
  const x = c.mul(float(1.0).sub(h.mod(2.0).sub(1.0).abs())).toVar("lblX");
  const m = float(value).sub(c).toVar("lblM");
  const sector = floor(h).toVar("lblSector");
  const rgb = vec3(0.0).toVar("lblRgb");
  If(sector.lessThan(1.0), () => rgb.assign(vec3(c, x, 0.0)))
    .ElseIf(sector.lessThan(2.0), () => rgb.assign(vec3(x, c, 0.0)))
    .ElseIf(sector.lessThan(3.0), () => rgb.assign(vec3(0.0, c, x)))
    .ElseIf(sector.lessThan(4.0), () => rgb.assign(vec3(0.0, x, c)))
    .ElseIf(sector.lessThan(5.0), () => rgb.assign(vec3(x, 0.0, c)))
    .Else(() => rgb.assign(vec3(c, 0.0, x)));
  return rgb.add(vec3(m));
};

/**
 * Material settings for a mask drawn OVER something.
 *
 * Not `commonMaterialSettings`: that sets `AdditiveBlending`, which is right for
 * compositing fluorescence channels and wrong for a mask — an additively blended
 * label washes out whatever is under it instead of covering it.
 */
const labelMaterialSettings = (material: NodeMaterial) => {
  material.transparent = true;
  material.blending = THREE.NormalBlending;
  material.depthWrite = false;
  material.depthTest = false;
  material.lights = false;
  // A reflected placement (negative determinant) flips the plane quad's
  // winding; FrontSide would cull the mask. Same reasoning as the image plane
  // in brickNodeMaterials.ts. The volume material overrides this to BackSide.
  material.side = THREE.DoubleSide;
};

export function createLabelPlaneNodeMaterial(
  pool: LayerBrickPool,
  dataRange: { minValue: number; maxValue: number },
  labelData: LabelUniformData,
): LabelMaterialBundle {
  const t = makeTraversalNodes(pool, dataRange);

  const uDesiredLevel = uniform(0, "int");
  /** INTEGER base slab z — the slab-mode resolve does the per-level floor +
   * recenter itself (see emitResolveBrickResidency), so no +0.5 here. */
  const uSlabBaseZ = uniform(0, "float");
  const uBaseShape = uniform(new THREE.Vector3(1, 1, 1), "vec3");
  const uSeed = uniform(labelData.seed, "float");
  const uBackground = uniform(labelData.background, "float");
  const uOpacity = uniform(labelData.opacity, "float");
  const uSaturation = uniform(labelData.saturation, "float");
  const uValue = uniform(labelData.value, "float");
  const uContour = uniform(labelData.contour ? 1 : 0, "float");
  const uContourWidth = uniform(labelData.contourWidth, "float");
  const uLutColorize = uniform(0, "float");
  const uLutFilter = uniform(0, "float");
  const uLutIdOffset = uniform(0, "float");
  const uLutWidth = uniform(1, "float");
  const uLutHeight = uniform(1, "float");
  // The build-time quantisation range and the live window. Created
  // unconditionally: a conditional node is a graph change and therefore a
  // recompile, which is exactly the contract this module keeps.
  const uLutValueMin = uniform(0, "float");
  const uLutValueMax = uniform(1, "float");
  const uLutClimMin = uniform(0, "float");
  const uLutClimMax = uniform(1, "float");
  const identityPalette = createIdentityPalette();
  const lutPalette = texture(identityPalette);
  const identityLut = identityValueLutTexture();
  const lut = texture(identityLut);

  const material = new NodeMaterial();
  labelMaterialSettings(material);

  material.fragmentNode = Fn(() => {
    // Quad uv → base voxel space, identical to the image plane's mapping so the
    // two register pixel-for-pixel. Corner-anchored, no flip.
    const baseVoxel = vec3(
      uv().x.mul(uBaseShape.x),
      uv().y.mul(uBaseShape.y),
      uSlabBaseZ,
    ).toVar("lblBaseVoxel");

    const resolved = emitResolveBrickResidency(t, baseVoxel, uDesiredLevel, {
      slabZ: true,
    });

    const id = emitDecodeId(t, resolved, "lblCenter");

    // Nothing resident anywhere along the chain: transparent, not black. A mask
    // still streaming in must not paint over the image under it.
    Discard(id.lessThan(-0.5));

    // The background id is the mask's "no object here" and is painted fully
    // transparent — the single most load-bearing line for a mask read over an
    // image, since most of a mask IS background.
    Discard(id.sub(uBackground).abs().lessThan(0.5));

    // --- contour: draw only where this object meets something else ----------
    // Four neighbour taps, each paying its OWN full residency resolve (see
    // `emitIdAt`) — about 5x the traversal of a filled mask. Affordable here
    // because a 2D layer resolves once per PIXEL, on one full-screen quad. It is
    // not affordable inside a 512-step ray loop, which is why the 3D label path
    // ignores `contour` entirely.
    //
    // A fragment survives when any 4-neighbour differs, so the outline lands on
    // the INSIDE edge of each object. That keeps two touching objects showing two
    // distinct boundaries rather than one shared seam.
    If(uContour.greaterThan(0.5), () => {
      const w = max(uContourWidth, float(0.0001));
      const onEdge = bool(false).toVar("lblOnEdge");
      const neighbours: [string, any, any][] = [
        ["lblNxL", w.negate(), float(0.0)],
        ["lblNxR", w, float(0.0)],
        ["lblNyD", float(0.0), w.negate()],
        ["lblNyU", float(0.0), w],
      ];
      for (const [name, dx, dy] of neighbours) {
        const at = vec3(baseVoxel.x.add(dx), baseVoxel.y.add(dy), baseVoxel.z);
        const other = emitIdAt(t, at, uDesiredLevel, name);
        // An unmapped neighbour (-1) is not a different object — see `emitIdAt`.
        onEdge.assign(
          onEdge.or(other.greaterThan(-0.5).and(other.sub(id).abs().greaterThan(0.5))),
        );
      }
      // A voxel at the volume's rim has no neighbour beyond it, and the resolve
      // clamps rather than reporting "outside" — so an object touching the edge
      // shows no outline there. Acceptable and cheap; the alternative is a bounds
      // test per neighbour for a one-voxel cosmetic difference.
      Discard(onEdge.not());
    });

    // The colour LUT: one texel per object, `rgb` its colouring and `a` its
    // visibility under the AND of every active rule. Indexed by `id - offset`,
    // decomposed the way fabriks decomposes an ordinal — slots run past any
    // backend's max texture width, so the table is 2D.
    const slot = id.sub(uLutIdOffset).toVar("lblSlot");
    const lutTexel = textureLoad(
      lut,
      ivec2(
        int(slot.mod(uLutWidth)),
        int(floor(slot.div(uLutWidth))),
      ),
    ).toVar("lblLut");

    const hue = fract(id.add(uSeed).mul(GOLDEN_RATIO_CONJUGATE));
    const hashed = emitHueColor(hue, uSaturation, uValue);
    // A colouring REPLACES the hash rather than tinting it — the mask is showing
    // a measurement now, not object identity.
    const { code, rgb } = emitLutColor(lutTexel, lutPalette, hashed, {
      uLutColorize,
      uLutValueMin,
      uLutValueMax,
      uLutClimMin,
      uLutClimMax,
    });

    // A filter drops the fragment entirely rather than dimming it: the object is
    // not being de-emphasised, it is not being drawn. Visibility is a sentinel
    // code now rather than an alpha channel, because the table holds a value and
    // has no spare channel — see `valueLut.ts`.
    Discard(uLutFilter.greaterThan(0.5).and(code.greaterThan(float(65534.5))));

    return vec4(rgb, uOpacity);
  })();

  return {
    material,
    nodes: {
      ...t,
      uDesiredLevel,
      uSlabBaseZ,
      uBaseShape,
      uSeed,
      uBackground,
      uOpacity,
      uSaturation,
      uValue,
      uContour,
      uContourWidth,
      uLutColorize,
      uLutFilter,
      uLutIdOffset,
      uLutWidth,
      uLutHeight,
      uLutValueMin,
      uLutValueMax,
      uLutClimMin,
      uLutClimMax,
      lutPalette,
      lut,
      // Kept on the handle so `setLabelColorLut` can rebind it when the LUT is
      // switched off, and so it is never mistaken for a built texture to dispose.
      identityLut,
      identityPalette,
    } as unknown as LabelMaterialNodes,
  };
}

/**
 * Push changed label render settings to the uniforms. No graph change and no
 * recompile — the same contract `updateChannelNodes` keeps for the image path.
 */
export function updateLabelNodes(nodes: LabelMaterialNodes, data: LabelUniformData): void {
  nodes.uSeed.value = data.seed;
  nodes.uBackground.value = data.background;
  nodes.uOpacity.value = data.opacity;
  nodes.uSaturation.value = data.saturation;
  nodes.uValue.value = data.value;
  nodes.uContour.value = data.contour ? 1 : 0;
  nodes.uContourWidth.value = data.contourWidth;
}

/**
 * The LUT-bearing subset both label materials share — the 2D plane and the 3D
 * first-hit raymarcher bind the same table and index it the same way, so one
 * setter serves both rather than each growing its own copy.
 */
export type LabelLutNodes = {
  uLutColorize: UniformNodeLike<number>;
  uLutFilter: UniformNodeLike<number>;
  uLutIdOffset: UniformNodeLike<number>;
  uLutWidth: UniformNodeLike<number>;
  uLutHeight: UniformNodeLike<number>;
  /** The range the codes were quantised over, at build time. */
  uLutValueMin: UniformNodeLike<number>;
  uLutValueMax: UniformNodeLike<number>;
  /** The window the user is looking through. Live — moving it is not a rebuild. */
  uLutClimMin: UniformNodeLike<number>;
  uLutClimMax: UniformNodeLike<number>;
};

/**
 * Swap in a built colour LUT, or switch it off. A texture swap plus five uniform
 * writes — never a graph change, so no recompile (the same contract
 * `fabriksMaterial.setColorLut` keeps).
 *
 * Disposes the texture it replaces, EXCEPT the identity: that one is created per
 * material and must outlive every swap, because switching the LUT off rebinds it.
 */
export function setLabelColorLut(
  nodes: LabelLutNodes,
  lut: {
    texture: THREE.DataTexture | null;
    width: number;
    height: number;
    idOffset: number;
    /** The range the codes were quantised over. See `valueLut.ts`. */
    valueMin?: number;
    valueMax?: number;
  },
  modes: { colorize: boolean; filter: boolean },
): void {
  const handle = nodes as unknown as {
    lut: { value: THREE.DataTexture };
    identityLut?: THREE.DataTexture;
  };
  const previous = handle.lut.value;
  const next = lut.texture ?? handle.identityLut ?? previous;
  if (previous !== next && previous !== handle.identityLut) previous.dispose();
  handle.lut.value = next;
  nodes.uLutIdOffset.value = lut.idOffset;
  nodes.uLutWidth.value = Math.max(1, lut.width);
  nodes.uLutHeight.value = Math.max(1, lut.height);
  // The quantisation range belongs to the TABLE, so it is written here and not
  // in `setLabelColorStyle`. Forgetting it is the one way a gene switch can
  // decode correctly and still be wrong — every value would be read against the
  // previous gene's range.
  nodes.uLutValueMin.value = lut.valueMin ?? 0;
  nodes.uLutValueMax.value = lut.valueMax ?? 1;
  nodes.uLutColorize.value = lut.texture && modes.colorize ? 1 : 0;
  nodes.uLutFilter.value = lut.texture && modes.filter ? 1 : 0;
}

/**
 * The APPEARANCE half: the window and the palette, neither of which touches the
 * table.
 *
 * This split is the point of the value encoding. Dragging a contrast slider or
 * switching a colormap used to rebuild the whole LUT and re-upload it — at a bin
 * lattice's scale, tens of megabytes to change how a number becomes a hue. Both
 * are now two uniform writes and a 1 KB palette row.
 *
 * The palette is ADOPTED IN PLACE rather than rebound when the size matches, for
 * the reason `brickNodeMaterials.adoptColormapAtlas` records: under WebGPU,
 * rebinding and disposing leaves the bind group pointing at a destroyed
 * GPUTexture, which three silently replaces with white.
 */
export function setLabelColorStyle(
  nodes: LabelLutNodes,
  style: { palette: THREE.DataTexture | null; climMin: number; climMax: number },
): void {
  nodes.uLutClimMin.value = style.climMin;
  nodes.uLutClimMax.value = style.climMax;
  if (!style.palette) return;

  const handle = nodes as unknown as {
    lutPalette: { value: THREE.DataTexture };
    identityPalette?: THREE.DataTexture;
  };
  // The shared implementation, which also carries the row's FILTERS across.
  // This used to be a local copy that adopted only the bytes — and because a
  // qualitative row and a continuous one are both 256x1 RGBA, switching
  // viridis -> hues took the same-length adopt path and left the new ranks
  // being sampled LINEAR, blending adjacent classes into colours belonging to
  // neither. `measurePalette`'s docblock names that hazard; the mask path had
  // it.
  if (handle.identityPalette) {
    setMeasurePalette(handle.lutPalette, handle.identityPalette, style.palette);
  }
}

// ---------------------------------------------------------------- 3D --------

/** Public shape of the label VOLUME material's own uniform nodes. */
export type LabelVolumeMaterialNodes = TraversalNodesPublic & {
  uBaseShape: UniformNodeLike<THREE.Vector3>;
  uDesiredLevel: UniformNodeLike<number>;
  uLodBias: UniformNodeLike<number>;
  uPxPerVoxelAtUnitDist: UniformNodeLike<number>;
  /** Per-axis world size of one base voxel (world-metric LOD; (1,1,1) =
   * legacy voxel metric — how `orkestrator.worldLod` off is pushed). */
  uVoxelWorldSize: UniformNodeLike<THREE.Vector3>;
  uMinDelta: UniformNodeLike<number>;
  uStepScale: UniformNodeLike<number>;
  uMaxSteps: UniformNodeLike<number>;
  uSeed: UniformNodeLike<number>;
  uBackground: UniformNodeLike<number>;
  uOpacity: UniformNodeLike<number>;
  uSaturation: UniformNodeLike<number>;
  uValue: UniformNodeLike<number>;
  uLutColorize: UniformNodeLike<number>;
  uLutFilter: UniformNodeLike<number>;
  uLutIdOffset: UniformNodeLike<number>;
  uLutWidth: UniformNodeLike<number>;
  uLutHeight: UniformNodeLike<number>;
  /** The range the codes were quantised over, at build time. */
  uLutValueMin: UniformNodeLike<number>;
  uLutValueMax: UniformNodeLike<number>;
  /** The window the user is looking through. Live — moving it is not a rebuild. */
  uLutClimMin: UniformNodeLike<number>;
  uLutClimMax: UniformNodeLike<number>;
};

export type LabelVolumeMaterialBundle = {
  material: NodeMaterial;
  nodes: LabelVolumeMaterialNodes;
};

/**
 * A label mask in 3D, rendered FIRST-HIT: march until the ray meets an object,
 * paint it, stop.
 *
 * WHY NOT THE PROJECTIONS THE IMAGE PATH OFFERS. Every one of them is a
 * reduction over the values along a ray, and object ids do not reduce:
 *
 *  - MIP keeps the LARGEST id, which is an arbitrary object — not the nearest,
 *    not the biggest, just whichever the segmenter happened to number highest.
 *    It would also change which object you see as the camera turns.
 *  - ATTENUATED MIP is MIP with a depth decay; same objection.
 *  - VOLUME accumulates alpha from a normalized intensity, and normalizing an id
 *    is the original sin this whole module exists to avoid.
 *  - ISO thresholds a scalar field. Ids are not ordered, so `id > threshold`
 *    means nothing.
 *
 * First hit IS the iso surface with the only predicate an id admits —
 * `id != background` — and it is what people mean by "show me the mask in 3D": an
 * opaque surface at the boundary of each object. It also gets more out of the
 * empty-space skip than any intensity mode does, because a mask's background is
 * exactly what gets marked EMPTY, so the ray hops whole bricks of it at a time.
 *
 * DELIBERATELY NOT HERE:
 *  - `contour`. A neighbour tap costs its own full residency resolve (see
 *    `emitIdAt`), so an outline would be ~5x the traversal — inside a 512-step
 *    ray loop rather than once per pixel. The 2D path is where contour lives.
 *  - Depth sorting. `depthWrite` is off, so an opaque first-hit label composites
 *    rather than depth-sorting against other volume layers. For one mask over one
 *    image that reads correctly; two overlapping masks do not resolve against
 *    each other. Stated rather than silently wrong.
 */
export function createLabelVolumeNodeMaterial(
  pool: LayerBrickPool,
  dataRange: { minValue: number; maxValue: number },
  labelData: LabelUniformData,
): LabelVolumeMaterialBundle {
  // Read ONCE per material build (kill switch — see shaderFlags.ts).
  const anisoStride = true;
  const t = makeTraversalNodes(pool, dataRange);
  const rayUniforms = makeVolumeRayUniforms();
  const { uBaseShape, uDesiredLevel } = rayUniforms;
  const rays = makeVolumeRayNodes(t, rayUniforms);

  const uMinDelta = uniform(1, "float");
  const uStepScale = uniform(1, "float");
  const uMaxSteps = uniform(MAX_RAY_STEPS, "float");
  const uSeed = uniform(labelData.seed, "float");
  const uBackground = uniform(labelData.background, "float");
  const uOpacity = uniform(labelData.opacity, "float");
  const uSaturation = uniform(labelData.saturation, "float");
  const uValue = uniform(labelData.value, "float");
  const uLutColorize = uniform(0, "float");
  const uLutFilter = uniform(0, "float");
  const uLutIdOffset = uniform(0, "float");
  const uLutWidth = uniform(1, "float");
  const uLutHeight = uniform(1, "float");
  // The build-time quantisation range and the live window. Created
  // unconditionally: a conditional node is a graph change and therefore a
  // recompile, which is exactly the contract this module keeps.
  const uLutValueMin = uniform(0, "float");
  const uLutValueMax = uniform(1, "float");
  const uLutClimMin = uniform(0, "float");
  const uLutClimMax = uniform(1, "float");
  const identityPalette = createIdentityPalette();
  const lutPalette = texture(identityPalette);
  const identityLut = identityValueLutTexture();
  const lut = texture(identityLut);

  const material = new NodeMaterial();
  labelMaterialSettings(material);
  // Unlike the 2D plane, a volume tests depth against the rest of the scene.
  material.depthTest = true;
  // BACK faces: the box is only a proxy to generate fragments for the march, and
  // once the camera dollies inside it every front face is behind the near plane —
  // the mask would blink out exactly when you zoom into it. The ray is
  // unaffected: its origin is the camera and its entry comes from the slab test.
  material.side = THREE.BackSide;

  material.fragmentNode = Fn(() => {
    const { originB, dirB, invD, boundsX, boundsY, rayLen } = emitVolumeRayBounds(
      rays,
      rayUniforms,
    );

    // Termination guarantee: uMaxSteps steps of at least this size always cross
    // the ray, whatever the per-sample LOD picks.
    const floorDelta = rayLen.div(max(float(uMaxSteps), 1.0));
    // NO jitter, deliberately unlike the intensity raymarcher. There it
    // dithers away the banding an accumulating projection shows at coarse
    // steps. Here the result is a hard SURFACE, and jittering the start would
    // move each pixel's hit point independently — turning a clean object
    // boundary into a noisy one. Terracing is the honest artefact of a coarse
    // step, and `stepLen` keeps it sub-voxel.
    const rayT = boundsX.toVar("lblRayT");

    const hitId = float(-1.0).toVar("lblHitId");

    Loop({ start: int(0), end: int(MAX_RAY_STEPS), type: "int", condition: "<" }, ({ i }: any) => {
      // The uniform cannot feed the compile-constant loop bound, so the tier cap
      // breaks here; floorDelta above guarantees full-ray coverage regardless.
      If(float(i).greaterThanEqual(float(uMaxSteps)), () => {
        Break();
      });
      If(rayT.greaterThan(boundsY), () => {
        Break();
      });
      If(hitId.greaterThan(-0.5), () => {
        Break();
      });

      const pB = originB.add(rayT.mul(dirB)).toVar("lblPB");
      const lvl = int(rays.desiredLevelAt(pB, originB)).toVar("lblLvl");

      // LOD-adaptive step: fine pitch where fine data is sampled. Under
      // orkestrator.anisoStride the pitch is the direction-projected
      // ellipsoidal voxel-crossing distance (see the intensity raymarcher's
      // levelPitch note — same rule, same rationale: a face-on ray through a
      // z-undownsampled mask stepped straight through the z planes and could
      // miss thin label slabs). Legacy: MAX spatial component. No jitter
      // either way (see above).
      const lvlScale = vec3(t.uLevelScale.element(lvl));
      const lblPitch = anisoStride
        ? float(0.75).div(max(float(length(dirB.div(lvlScale))), 1e-6))
        : float(0.75).mul(max(lvlScale.x, max(lvlScale.y, lvlScale.z)));
      const stepLen = (anisoStride
        ? max(float(floorDelta), lblPitch)
        : max(max(float(uMinDelta), floorDelta), lblPitch)
      )
        .mul(max(float(uStepScale), 1.0))
        .toVar("lblStep");

      const resolved = emitResolveBrickResidency(t, pB, lvl);

      // Empty-space skip: hop to the exit of the RESOLVED level's cell rather
      // than stepping through it. This is where a mask wins big — its background
      // is uniform, so it is marked EMPTY and skipped a whole brick at a time.
      const hopPastCell = () => {
        rayT.addAssign(
          max(stepLen, float(rays.brickExitRel(pB, invD, resolved.hopLevel)).add(0.01)),
        );
        Continue();
      };

      // Nothing mapped anywhere along the chain: hop.
      If(resolved.status.lessThan(0.5), () => {
        hopPastCell();
      });

      const id = emitDecodeId(t, resolved, "lblStepSample");

      // A uniform brick of pure background is the mask's empty space — hop the
      // whole cell instead of stepping through it.
      //
      // ONLY when the EMPTY entry sits at the level we actually asked for
      // (`hopLevel <= lvl`; levels run fine→coarse). If the walk FELL BACK to a
      // coarser ancestor — which is the normal state while fine bricks are still
      // streaming — that ancestor's "uniformly background" claim is a statement
      // about the COARSE data only. An object thinner than a coarse voxel does
      // not survive the downsample, so hopping the whole coarse cell skips
      // straight past regions where the fine level does have objects, and they
      // then pop into view one brick at a time as the fine data lands.
      //
      // The intensity raymarcher cannot hit this: for it, "EMPTY and skippable"
      // means the uniform value normalizes to ~0, and a coarse brick over real
      // signal is never uniform-zero. For a sparse mask, "EMPTY and background"
      // is exactly what most of a COARSE level is, which is why the same skip
      // that is a big win at the target level is a correctness bug above it.
      //
      // Falling through to a plain `stepLen` costs steps through background
      // while streaming, and buys a mask that refines in place instead of
      // assembling itself.
      If(
        resolved.status
          .greaterThan(1.5)
          .and(id.sub(uBackground).abs().lessThan(0.5))
          .and(resolved.hopLevel.lessThanEqual(lvl)),
        () => {
          hopPastCell();
        },
      );

      If(id.sub(uBackground).abs().greaterThan(0.5), () => {
        hitId.assign(id);
      });

      rayT.addAssign(stepLen);
    });

    // The ray crossed the whole volume without meeting an object.
    Discard(hitId.lessThan(-0.5));

    const slot = hitId.sub(uLutIdOffset).toVar("lblVolSlot");
    const lutTexel = textureLoad(
      lut,
      ivec2(int(slot.mod(uLutWidth)), int(floor(slot.div(uLutWidth)))),
    ).toVar("lblVolLut");

    const hue = fract(hitId.add(uSeed).mul(GOLDEN_RATIO_CONJUGATE));
    const hashed = emitHueColor(hue, uSaturation, uValue);
    // A colouring REPLACES the hash rather than tinting it, and the hash is why
    // this is a uniform and not another LUT channel — `columnLut.ts`'s header.
    const { code, rgb } = emitLutColor(lutTexel, lutPalette, hashed, {
      uLutColorize,
      uLutValueMin,
      uLutValueMax,
      uLutClimMin,
      uLutClimMax,
    });

    // A filtered-out object is not a surface: the ray should have passed THROUGH
    // it. Discarding the fragment is not that — it drops the pixel entirely
    // rather than revealing whatever is behind — but resuming the march past a
    // filtered hit would need the LUT read inside the loop, which is a texture
    // fetch per step. The trade is stated here rather than hidden: a filter in 3D
    // punches holes rather than peeling layers.
    Discard(uLutFilter.greaterThan(0.5).and(code.greaterThan(float(65534.5))));

    return vec4(rgb, uOpacity);
  })();

  return {
    material,
    nodes: {
      ...t,
      uBaseShape,
      uDesiredLevel,
      uLodBias: rayUniforms.uLodBias,
      uPxPerVoxelAtUnitDist: rayUniforms.uPxPerVoxelAtUnitDist,
      uVoxelWorldSize: rayUniforms.uVoxelWorldSize,
      uMinDelta,
      uStepScale,
      uMaxSteps,
      uSeed,
      uBackground,
      uOpacity,
      uSaturation,
      uValue,
      uLutColorize,
      uLutFilter,
      uLutIdOffset,
      uLutWidth,
      uLutHeight,
      uLutValueMin,
      uLutValueMax,
      uLutClimMin,
      uLutClimMax,
      lutPalette,
      lut,
      identityLut,
      identityPalette,
    } as unknown as LabelVolumeMaterialNodes,
  };
}

/** The 3D twin of `updateLabelNodes`; same fields, same no-recompile contract. */
export function updateLabelVolumeNodes(
  nodes: LabelVolumeMaterialNodes,
  data: LabelUniformData,
): void {
  nodes.uSeed.value = data.seed;
  nodes.uBackground.value = data.background;
  nodes.uOpacity.value = data.opacity;
  nodes.uSaturation.value = data.saturation;
  nodes.uValue.value = data.value;
  // `contour` and `contourWidth` are deliberately absent — see the material.
}
