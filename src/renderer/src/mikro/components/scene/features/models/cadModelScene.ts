import * as THREE from "three";
import { MeshStandardNodeMaterial } from "three/webgpu";

import { asBlendedGlass } from "@/mikro/lib/cadModels/glass";

import { CROP_PLANE_FAR, createCropPlanes, type CropPlanes } from "../../platform/coords/cropBox";

/**
 * The parts of a CAD model layer that are not React: which planes clip it, and
 * how its materials are drawn. Pure, so both are testable without a canvas.
 *
 * A CAD model is hardware around the sample, drawn as authored. The layer's
 * settings act on top of the file's own materials and never replace them for
 * good: each mesh keeps its AUTHORED material (a per-layer clone), and every
 * appearance change is recomputed from that, so clearing `materialColor` or
 * raising opacity back to 1 returns exactly what the file said.
 */

/**
 * The most metal a surface is drawn with. The scene has an ambient light and
 * one point light, and no environment map: a fully metallic PBR surface
 * reflects only its environment, so a CAD export's steel holder would render
 * black. Capped here, on the per-layer clone, never on the file.
 */
export const MAX_METALNESS = 0.3;

/** Draw order above the image quad in 2D, the annotation and mesh layers' slab convention. */
export const SLAB_RENDER_ORDER = 2;

export type CadAppearance = {
  /** The layer's alpha, multiplied into each material's own. */
  opacity: number;
  /** One RGBA (0..255) colour replacing every material, or null for the file's own. */
  materialColor: readonly number[] | null | undefined;
  wireframe: boolean;
  /** 2D slab mode: drawn as an overlay (depth test off) above the image. */
  slab: boolean;
};

type Authored = { opacity: number; transparent: boolean; depthWrite: boolean };

const AUTHORED = "cadAuthored";

/** One mesh of the model and the materials the file gave it, cloned for this layer. */
export type CadMeshRecord = {
  mesh: THREE.Mesh;
  authored: THREE.Material[];
  multi: boolean;
};

const asList = (material: THREE.Material | THREE.Material[]): THREE.Material[] =>
  Array.isArray(material) ? material : [material];

/**
 * Take over a cloned scene's meshes: clone each material for this layer (the
 * cached file's materials are shared by every layer drawing it) and remember
 * what it authored, so later appearance changes start from the file.
 */
export const adoptMeshes = (root: THREE.Object3D): CadMeshRecord[] => {
  const records: CadMeshRecord[] = [];
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh !== true || !mesh.material) return;
    const multi = Array.isArray(mesh.material);
    const authored = asList(mesh.material).map((source) => {
      const material = source.clone();
      // Before the authored values are taken: what the layer starts from is
      // the glass as this scene can draw it (`glass.ts`).
      asBlendedGlass(material);
      const standard = material as THREE.MeshStandardMaterial;
      if (typeof standard.metalness === "number" && !standard.envMap) {
        standard.metalness = Math.min(standard.metalness, MAX_METALNESS);
      }
      const base: Authored = {
        opacity: material.opacity,
        transparent: material.transparent,
        depthWrite: material.depthWrite,
      };
      material.userData[AUTHORED] = base;
      return material;
    });
    mesh.material = multi ? authored : authored[0];
    records.push({ mesh, authored, multi });
  });
  return records;
};

/** The one material standing in for all of a model's when the layer overrides its colour. */
export const createOverrideMaterial = (): THREE.Material =>
  new MeshStandardNodeMaterial({ roughness: 0.55, metalness: 0.0 });

const applyTo = (
  material: THREE.Material,
  base: Authored,
  appearance: CadAppearance,
): void => {
  const opacity = base.opacity * appearance.opacity;
  const transparent = base.transparent || opacity < 1;
  // A see-through part is not an occluder: the volume compositor only takes
  // opaque depth writers into its prepass (`passVisibility.ts`), and a glass
  // coverslip hiding the volume behind it would be wrong.
  const depthWrite = transparent ? false : base.depthWrite;
  const depthTest = !appearance.slab;
  const standard = material as THREE.MeshStandardMaterial;
  // Opacity is a uniform; these four are the pipeline. Flagging `needsUpdate`
  // only when one of them moves keeps an opacity drag from recompiling every
  // part's pipeline per tick.
  const rebuild =
    material.transparent !== transparent ||
    material.depthWrite !== depthWrite ||
    material.depthTest !== depthTest ||
    standard.wireframe !== appearance.wireframe;
  material.opacity = opacity;
  material.transparent = transparent;
  material.depthWrite = depthWrite;
  material.depthTest = depthTest;
  standard.wireframe = appearance.wireframe;
  if (rebuild) material.needsUpdate = true;
};

/**
 * Draw every mesh as `appearance` says: its own materials, or the override in
 * the layer's colour. Idempotent, and always recomputed from the authored
 * values, never from the last application.
 */
export const applyAppearance = (
  records: readonly CadMeshRecord[],
  override: THREE.Material,
  appearance: CadAppearance,
): void => {
  const color = appearance.materialColor;
  const overriding = Array.isArray(color) && color.length >= 3;
  if (overriding) {
    const material = override as THREE.MeshStandardMaterial;
    material.color.setRGB(color[0] / 255, color[1] / 255, color[2] / 255, THREE.SRGBColorSpace);
    const alpha = color.length > 3 ? color[3] / 255 : 1;
    applyTo(override, { opacity: alpha, transparent: alpha < 1, depthWrite: true }, appearance);
  }
  for (const record of records) {
    record.mesh.renderOrder = appearance.slab ? SLAB_RENDER_ORDER : 0;
    if (overriding) {
      record.mesh.material = override;
      continue;
    }
    for (const material of record.authored) {
      applyTo(material, material.userData[AUTHORED] as Authored, appearance);
    }
    record.mesh.material = record.multi ? record.authored : record.authored[0];
  }
};

export type ClipWindow = { axis: string; min?: number | null; max?: number | null };

/**
 * The lens' clip box as six WORLD-space planes: its windows are stated in the
 * model's own axes and unit, so the box is built there, one pair of planes per
 * vertex slot, and carried into world by the layer's placement. An axis no
 * window names, or an open side, is pushed out of the way.
 *
 * `slots` names the axis of each vertex component (the model's coordinate
 * system's axes, in order); a window on an axis the model does not have clips
 * nothing.
 */
export const lensClipPlanes = (
  windows: readonly ClipWindow[],
  slots: readonly string[],
  matrix: THREE.Matrix4,
  into: CropPlanes = createCropPlanes(),
): CropPlanes => {
  const normals = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
  ];
  for (let slot = 0; slot < 3; slot++) {
    const window = windows.find((candidate) => candidate.axis === slots[slot]);
    const low = into[slot * 2];
    const high = into[slot * 2 + 1];
    low.normal.copy(normals[slot * 2]);
    high.normal.copy(normals[slot * 2 + 1]);
    // Keeps value >= min, and value <= max: the `updateCropPlanes` pairing.
    low.constant = window?.min != null ? -window.min : CROP_PLANE_FAR;
    high.constant = window?.max != null ? window.max : CROP_PLANE_FAR;
    // An open side stays out of the way: carried through a scale it would land
    // somewhere finite and clip a model it says nothing about.
    if (window?.min != null) low.applyMatrix4(matrix);
    if (window?.max != null) high.applyMatrix4(matrix);
  }
  return into;
};
