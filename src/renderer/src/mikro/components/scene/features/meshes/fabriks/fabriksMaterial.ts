import * as THREE from "three";
import { MeshStandardNodeMaterial } from "three/webgpu";
import * as TSLTyped from "three/tsl";
import {
  DEFAULT_INSTANCE_COLORMAP,
  GOLDEN_RATIO_CONJUGATE,
  INSTANCE_COLORMAP_SPECS,
  type FabriksInstanceColormap,
  type InstanceColormapSpec,
} from "../../../platform/gpu/instanceColormaps";
import {
  disposeMeasurePalette,
  identityPaletteTexture,
  setMeasurePalette,
} from "../../../platform/gpu/measurePalette";
import {
  VALUE_LUT_HIDDEN_EDGE,
  emitValueLutColor,
  identityValueLutTexture,
} from "../../../platform/gpu/valueLutNodes";

// Same escape hatch as brickNodeMaterials.ts: three's TSL TypeScript surface
// lags the runtime API (method chaining on nodes is typed dynamically).
/* eslint-disable @typescript-eslint/no-explicit-any */
const TSL = TSLTyped as any;
const {
  Discard,
  Fn,
  attribute,
  clamp,
  float,
  fract,
  materialColor,
  mix,
  select,
  texture,
  uniform,
  vec2,
  vec3,
} = TSL;

/**
 * The mesh collection's material: standard PBR shading, per-INSTANCE color as
 * the default, and per-instance SELECTION baked into the same fragment logic.
 *
 * Every vertex carries its object's dense `objectOrdinal` (fabriksDecode) —
 * the categorical id the format was built around — so coloring, highlighting
 * and isolating by instance are each one attribute read in TSL: no LUT, no
 * per-object draw state, identical through the BatchedMesh (the attribute is
 * part of the batch layout).
 *
 * Selection is two UNIFORMS (`selectedOrdinal`, `isolate`) always present in
 * the compiled program: picking or isolating an object mutates `.value` only —
 * never a pipeline rebuild. Which palette applies is a
 * `FabriksInstanceColormap` (`instanceColormaps.ts`); `null` = the material's
 * uniform `color`, read via the TSL `materialColor` accessor so the selection
 * logic wraps BOTH modes.
 *
 * WebGPU-only by design (the scene hard-requires the WebGPU backend), hence
 * a node material rather than `onBeforeCompile` GLSL.
 */

export type FabriksMaterialHandle = {
  material: MeshStandardNodeMaterial;
  uniforms: {
    /** The selected instance's ordinal; -1 = no selection. */
    selectedOrdinal: { value: number };
    /** 1 = draw ONLY the selected instance (isolation); 0 = draw all. */
    isolate: { value: number };
    /** 1 = the LUT's decoded value IS this object's colour (a `colorBy` is active). */
    lutColorize: { value: number };
    /** 1 = the LUT's sentinel decides visibility (a `filterBy` is active). */
    lutFilter: { value: number };
    /** The LUT's dimensions, for the ordinal → texel decomposition. */
    lutWidth: { value: number };
    lutHeight: { value: number };
    /** The range the codes were quantised over (`valueLut.ts`). */
    uLutValueMin: { value: number };
    uLutValueMax: { value: number };
    /** The colormap window — appearance, movable without touching the table. */
    uLutClimMin: { value: number };
    uLutClimMax: { value: number };
  };
  /** The ordinal → 16-bit value-code lookup (`fabriksColorLut.ts`); swap
   *  `.value` to rebind. RG8, the label mask's encoding — `valueLut.ts`. */
  lut: { node: { value: THREE.Texture } };
  /** The 256×1 colormap row the decoded value samples. Adopted in place —
   *  `setMeasurePalette`'s WebGPU-safe dance. */
  lutPalette: { node: { value: THREE.Texture }; identity: THREE.DataTexture };
};

/** ordinal → rgb node for one colormap spec. */
const buildInstanceColorNode = (spec: InstanceColormapSpec) => {
  const ordinal = attribute("objectOrdinal", "float");
  const hue = fract(ordinal.mul(float(GOLDEN_RATIO_CONJUGATE)));
  // Standard hue→rgb ramp: clamp(|fract(h + (1, 2/3, 1/3))·6 − 3| − 1, 0, 1).
  const ramp = clamp(
    fract(hue.add(vec3(1.0, 2.0 / 3.0, 1.0 / 3.0))).mul(6.0).sub(3.0).abs().sub(1.0),
    0.0,
    1.0,
  );
  let saturation = float(spec.saturation);
  let value = float(spec.value);
  if (spec.tiered) {
    // s tiers ×{0.7, 0.85, 1.0} by ordinal mod 3, v tiers ×{0.78, 1.0} by
    // mod 2 — six brightness/saturation bands riding the hue scatter.
    saturation = saturation.mul(ordinal.mod(3.0).mul(0.15).add(0.7));
    value = value.mul(ordinal.mod(2.0).mul(0.22).add(0.78));
  }
  return mix(vec3(1.0), ramp, saturation).mul(value);
};

/**
 * Wrap a base color node with the per-object table lookup (colour + filter)
 * and the selection logic (isolate + highlight).
 *
 * The LUT is read UNCONDITIONALLY and its two modes are uniforms, not branches
 * in the graph: turning a colouring or a rule on and off is then a `.value`
 * write, never a pipeline rebuild — the same reason selection is uniforms. One
 * texel fetch per fragment buys both features, since they are two channels of
 * one answer.
 *
 * The ordinal decomposes into a 2D texel because a strip wide enough for
 * fabriks's ordinal ceiling exceeds any backend's max texture dimension. The
 * `+ 0.5` is the texel CENTRE — NEAREST sampling on a boundary is a coin flip
 * between two objects' colours.
 */
const composeColorNode = (handle: FabriksMaterialHandle, baseNode: unknown) =>
  Fn(() => {
    const ordinal = attribute("objectOrdinal", "float");

    const width = float(handle.uniforms.lutWidth);
    const height = float(handle.uniforms.lutHeight);
    const column = ordinal.mod(width);
    const row = ordinal.div(width).floor();
    const lutTexel = (handle.lut.node as unknown as { sample: (uv: unknown) => any }).sample(
      vec2(column.add(0.5).div(width), row.add(0.5).div(height)),
    );

    // The table holds a VALUE code, not a colour (`valueLut.ts`): the decode,
    // the window and the palette are uniforms, so a colormap or clim nudge
    // never repaints or re-uploads the table. A colouring REPLACES the base
    // rather than tinting it — `emitValueLutColor` mixes by
    // `lutColorize · hasValue`, so a slot with no value keeps the id hash.
    const { code, rgb } = emitValueLutColor(lutTexel, handle.lutPalette.node, vec3(baseNode), {
      uLutColorize: float(handle.uniforms.lutColorize),
      uLutValueMin: float(handle.uniforms.uLutValueMin),
      uLutValueMax: float(handle.uniforms.uLutValueMax),
      uLutClimMin: float(handle.uniforms.uLutClimMin),
      uLutClimMax: float(handle.uniforms.uLutClimMax),
    });

    // A rule that drops this object drops it here rather than by removing it
    // from the batch: the batch's slots and the LOD cache are planned by what
    // is RESIDENT, and a filter must not re-plan and re-fetch on every toggle.
    // Visibility is the HIDDEN sentinel code now rather than an alpha channel
    // — the table holds a value and has no spare channel; see `valueLut.ts`.
    Discard(
      float(handle.uniforms.lutFilter)
        .greaterThan(0.5)
        .and(code.greaterThan(float(VALUE_LUT_HIDDEN_EDGE))),
    );

    // Float equality is exact here: ordinals are integers ≤ 2^24 on both sides.
    const selected = ordinal.equal(float(handle.uniforms.selectedOrdinal));
    Discard(float(handle.uniforms.isolate).greaterThan(0.5).and(selected.not()));

    // ~35% toward white: the identified object pops without a recompile.
    return select(selected, mix(rgb, vec3(1.0), 0.35), rgb);
  })();

export function createFabriksMaterial(): FabriksMaterialHandle {
  const material = new MeshStandardNodeMaterial();
  material.color = new THREE.Color(0.72, 0.72, 0.76);
  material.roughness = 0.85;
  material.metalness = 0.0;
  material.side = THREE.DoubleSide;
  material.flatShading = true; // derivative normals — no normal attribute
  const paletteIdentity = identityPaletteTexture();
  const handle: FabriksMaterialHandle = {
    material,
    uniforms: {
      selectedOrdinal: uniform(-1),
      isolate: uniform(0),
      lutColorize: uniform(0),
      lutFilter: uniform(0),
      lutWidth: uniform(1),
      lutHeight: uniform(1),
      uLutValueMin: uniform(0),
      uLutValueMax: uniform(1),
      uLutClimMin: uniform(0),
      uLutClimMax: uniform(1),
    },
    lut: { node: texture(identityValueLutTexture()) },
    lutPalette: { node: texture(paletteIdentity), identity: paletteIdentity },
  };
  setInstanceColoring(handle, DEFAULT_INSTANCE_COLORMAP);
  return handle;
}

/**
 * Apply an instance colormap, or `null` for the material's uniform `color`
 * (via the `materialColor` accessor — still a colorNode, so selection logic
 * applies in both modes). The caller owns `needsUpdate` — a colormap change
 * IS a pipeline change; a selection change never is.
 */
export function setInstanceColoring(
  handle: FabriksMaterialHandle,
  colormap: FabriksInstanceColormap | null,
): void {
  const base = colormap ? buildInstanceColorNode(INSTANCE_COLORMAP_SPECS[colormap]) : materialColor;
  handle.material.colorNode = composeColorNode(handle, base);
}

/**
 * Bind a freshly built ordinal → value-code lookup, or `null` to fall back to
 * the identity (visible, no value).
 *
 * Rebinding is a uniform write and a texture swap, never a graph change, so it
 * costs no recompile. The caller owns disposing the texture it replaces: this
 * module never learns when the old one stopped being referenced. The WINDOW —
 * the range the codes were quantised over — travels with the table it
 * describes; the clims and the palette are appearance and travel through
 * `setColorAppearance` instead.
 */
export function setColorLut(
  handle: FabriksMaterialHandle,
  lut: {
    texture: THREE.Texture;
    width: number;
    height: number;
    window: { valueMin: number; valueMax: number };
  } | null,
  modes: { colorize: boolean; filter: boolean },
): void {
  if (lut) {
    handle.lut.node.value = lut.texture;
    handle.uniforms.lutWidth.value = lut.width;
    handle.uniforms.lutHeight.value = lut.height;
    handle.uniforms.uLutValueMin.value = lut.window.valueMin;
    handle.uniforms.uLutValueMax.value = lut.window.valueMax;
  }
  handle.uniforms.lutColorize.value = lut && modes.colorize ? 1 : 0;
  handle.uniforms.lutFilter.value = lut && modes.filter ? 1 : 0;
}

/**
 * The APPEARANCE half: the palette row and the clim window, neither of which
 * touches the table — dragging a contrast slider or switching a colormap is
 * two uniform writes and a 1 KB palette refill, the `setLabelColorStyle`
 * split. The palette is adopted in place (`setMeasurePalette`), so the bound
 * texture object survives — the WebGPU bind-group invariant.
 */
export function setColorAppearance(
  handle: FabriksMaterialHandle,
  style: { palette: THREE.DataTexture | null; climMin: number; climMax: number },
): void {
  handle.uniforms.uLutClimMin.value = style.climMin;
  handle.uniforms.uLutClimMax.value = style.climMax;
  setMeasurePalette(handle.lutPalette.node, handle.lutPalette.identity, style.palette);
}

/** Dispose what the handle's palette slot owns. For the manager's teardown. */
export function disposeColorAppearance(handle: FabriksMaterialHandle): void {
  disposeMeasurePalette(handle.lutPalette.node, handle.lutPalette.identity);
}
