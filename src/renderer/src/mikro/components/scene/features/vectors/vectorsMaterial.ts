/**
 * The vector layer's material: one instanced GLYPH per sampled vector, oriented and
 * scaled on the GPU.
 *
 * A merge of two existing files, on purpose. The bundle shape — storage buffers per
 * instance, a palette row as a texture, windows as uniforms — is `pointsMaterial.ts`;
 * the vertex program — a branch-free orthonormal basis from a per-instance direction,
 * placement in the data's own frame — is `networkMaterial.ts`'s arrow-cone section.
 * The difference from the network is that the direction comes straight from a
 * per-instance vec3 buffer rather than an edge's endpoint pair, which SIMPLIFIES it.
 *
 * Glyphs are real triangle geometry, never sprites: OCTREE_RENDERER.md §7 — a point
 * or sprite primitive is never an occluder in the volume pass, so a sprite glyph
 * would vanish behind volume data it is in front of.
 *
 * ## The glyph is four template geometries sharing ONE material
 *
 * ARROW is a shaft (y ∈ [0, 0.72]) plus a head (y ∈ [0.72, 1]); LINE and CONE span
 * the whole unit length. All four live in the same local convention — base at the
 * origin, tip at local +y = 1, radial extent 1 — so one vertex program places any of
 * them: local y scales by the drawn length, local x/z by the drawn width. Which
 * meshes are visible is the only thing a glyph switch changes; no rebuild, no
 * recompile, and ARROW's two parts cannot drift apart because they are placed by the
 * same instance data through the same program.
 *
 * ## Magnitude is derived in the shader, not stored
 *
 * The vector buffer is the single source: colour (through the palette, windowed by
 * the clims) and drawn length both come from `length(vector)` per instance. A
 * separate magnitude buffer would be a second copy of one fact.
 */
import * as THREE from "three";
import { MeshBasicNodeMaterial, StorageInstancedBufferAttribute } from "three/webgpu";
import * as TSLTyped from "three/tsl";
import {
  createMeasureAppearance,
  disposeMeasurePalette,
  identityPaletteTexture,
  measureRampColor,
  setMeasurePalette,
  type MeasureAppearanceNodes,
} from "../../platform/gpu/measurePalette";

/* eslint-disable @typescript-eslint/no-explicit-any */
const TSL = TSLTyped as any;
const {
  Fn,
  abs,
  cameraProjectionMatrix,
  cross,
  float,
  instanceIndex,
  max,
  mix,
  modelViewMatrix,
  normalView,
  normalize,
  positionGeometry,
  select,
  storage,
  texture,
  uniform,
  vec3,
  vec4,
} = TSL;

export type VectorGlyphKind = "arrow" | "line" | "cone";

export type VectorMaterialNodes = MeasureAppearanceNodes & {
  /** Drawn length per unit of magnitude, in the DATA's voxel units (the layer affine maps to world). */
  uGlyphScale: any;
  /** Radial width as a fraction of the drawn length. */
  uThickness: any;
  uOpacity: any;
  uFlatColor: any;
};

export type VectorMaterialBundle = {
  material: MeshBasicNodeMaterial;
  nodes: VectorMaterialNodes;
  /** Per-instance sample position, in lens voxel coordinates (x, y, z). */
  positions: StorageInstancedBufferAttribute;
  /** Per-instance vector, in the same frame and component order as the positions. */
  vectors: StorageInstancedBufferAttribute;
  capacity: number;
  /** All four template meshes; `setGlyph` decides which draw. Parent them all. */
  meshes: THREE.Mesh[];
  setGlyph: (glyph: VectorGlyphKind) => void;
  setCount: (count: number) => void;
  setPalette: (row: THREE.DataTexture | null) => void;
  markUploaded: () => void;
  dispose: () => void;
};

/** A template geometry re-hosted as instanced, sans attributes nothing reads. */
const instancedFrom = (template: THREE.BufferGeometry): THREE.InstancedBufferGeometry => {
  const geometry = new THREE.InstancedBufferGeometry().copy(template as any);
  geometry.deleteAttribute("uv");
  template.dispose();
  return geometry;
};

/** How much of an ARROW's unit length is shaft; the head takes the rest. */
const SHAFT = 0.72;
const RADIAL_SEGMENTS = 8;

export const createVectorMaterial = (capacity: number): VectorMaterialBundle => {
  // A zero-size GPU buffer is an invalid binding; one spare slot is 24 bytes.
  const slots = Math.max(1, capacity);
  const positions = new StorageInstancedBufferAttribute(new Float32Array(slots * 3), 3);
  const vectors = new StorageInstancedBufferAttribute(new Float32Array(slots * 3), 3);

  const nodes: VectorMaterialNodes = {
    uGlyphScale: uniform(1, "float"),
    uThickness: uniform(0.16, "float"),
    uOpacity: uniform(1, "float"),
    uFlatColor: uniform(new THREE.Color(1, 1, 1)),
    ...createMeasureAppearance(1),
  };

  const paletteIdentity = identityPaletteTexture();
  const paletteNode = texture(paletteIdentity);

  const positionsNode = storage(positions, "vec3", slots);
  const vectorsNode = storage(vectors, "vec3", slots);

  const material = new MeshBasicNodeMaterial();
  material.transparent = true;

  material.vertexNode = Fn(() => {
    const centre = positionsNode.element(instanceIndex);
    const vector = vec3(vectorsNode.element(instanceIndex));
    const len = vector.length();
    const valid = len.greaterThan(float(1e-12));
    const axis = select(valid, vector.div(len), vec3(0, 1, 0));

    // Branch-free orthonormal basis, exactly as the network's arrow cones build
    // it: the helper flips when |axis.y| ≥ 0.99, so it is never parallel to the
    // axis, and [u, axis, w] has determinant +1 so the winding survives.
    const helper = select(abs(axis.y).lessThan(float(0.99)), vec3(0, 1, 0), vec3(1, 0, 0));
    const u = normalize(cross(helper, axis));
    const w = cross(u, axis);

    // A zero vector collapses to a point rather than being skipped — the same
    // choice the network makes for a zero-length edge.
    const drawn = len.mul(nodes.uGlyphScale).mul(select(valid, float(1), float(0)));
    const width = drawn.mul(nodes.uThickness);

    const local = positionGeometry;
    const placed = vec3(centre)
      .add(u.mul(local.x.mul(width)))
      .add(axis.mul(local.y.mul(drawn)))
      .add(w.mul(local.z.mul(width)));
    return cameraProjectionMatrix.mul(modelViewMatrix.mul(vec4(placed, 1.0)));
  })();

  material.colorNode = Fn(() => {
    const len = vec3(vectorsNode.element(instanceIndex)).length();
    const mapped = measureRampColor(len, nodes, paletteNode);
    const rgb = mix(vec3(nodes.uFlatColor), mapped, nodes.uColorize);
    // The network glyphs' cheap depth cue: the geometry normal is not rotated by
    // the per-instance basis, so this is approximate — and worth exactly what it
    // costs, which is one dot product.
    const shade = max(normalView.z, float(0)).mul(0.45).add(0.55);
    return vec4(rgb.mul(shade), nodes.uOpacity);
  })();

  // Four templates, one local convention: base at the origin, tip at +y = 1.
  const shaftTemplate = new THREE.CylinderGeometry(0.35, 0.35, SHAFT, RADIAL_SEGMENTS);
  shaftTemplate.translate(0, SHAFT / 2, 0);
  const headTemplate = new THREE.ConeGeometry(1, 1 - SHAFT, RADIAL_SEGMENTS);
  headTemplate.translate(0, SHAFT + (1 - SHAFT) / 2, 0);
  const lineTemplate = new THREE.CylinderGeometry(0.35, 0.35, 1, RADIAL_SEGMENTS);
  lineTemplate.translate(0, 0.5, 0);
  const coneTemplate = new THREE.ConeGeometry(1, 1, RADIAL_SEGMENTS);
  coneTemplate.translate(0, 0.5, 0);

  const parts: Record<VectorGlyphKind, THREE.InstancedBufferGeometry[]> = {
    arrow: [instancedFrom(shaftTemplate), instancedFrom(headTemplate)],
    line: [instancedFrom(lineTemplate)],
    cone: [instancedFrom(coneTemplate)],
  };
  const geometries = [...parts.arrow, ...parts.line, ...parts.cone];

  const meshesByGlyph = Object.fromEntries(
    (Object.keys(parts) as VectorGlyphKind[]).map((glyph) => [
      glyph,
      parts[glyph].map((geometry) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = false;
        mesh.visible = false;
        return mesh;
      }),
    ]),
  ) as Record<VectorGlyphKind, THREE.Mesh[]>;
  const meshes = [...meshesByGlyph.arrow, ...meshesByGlyph.line, ...meshesByGlyph.cone];

  for (const geometry of geometries) geometry.instanceCount = 0;

  return {
    material,
    nodes,
    positions,
    vectors,
    capacity: slots,
    meshes,
    setGlyph: (glyph) => {
      for (const kind of Object.keys(meshesByGlyph) as VectorGlyphKind[]) {
        for (const mesh of meshesByGlyph[kind]) mesh.visible = kind === glyph;
      }
    },
    setCount: (count) => {
      const bounded = Math.min(count, slots);
      for (const geometry of geometries) geometry.instanceCount = bounded;
    },
    setPalette: (row) => setMeasurePalette(paletteNode, paletteIdentity, row),
    markUploaded: () => {
      positions.needsUpdate = true;
      vectors.needsUpdate = true;
    },
    dispose: () => {
      for (const geometry of geometries) geometry.dispose();
      material.dispose();
      disposeMeasurePalette(paletteNode, paletteIdentity);
    },
  };
};
