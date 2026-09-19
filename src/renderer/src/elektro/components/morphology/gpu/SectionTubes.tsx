import { useCursor } from "@react-three/drei";
import { type ThreeEvent, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial } from "three/webgpu";
import type { Morphology, MorphologySection } from "../model/buildMorphology";
import { HIGHLIGHT_COLOR } from "../model/colouring";
import {
  type MorphologyState,
  useMorphologyStore,
  useMorphologyStoreApi,
} from "../stores/morphologyStore";
import { INSTANCE_UPLOAD_FRAMES } from "./instanceUpload";

/**
 * The morphology as two instanced meshes — every centreline segment one
 * open cylinder, every centreline point one sphere capping the joints — plus
 * an invisible, fatter copy of the cylinders to pick against.
 *
 * Instanced rather than one mesh per section (the WebGL viewer's two meshes
 * a section): a few thousand sections is three draw calls, and colour changes
 * are a buffer write, not a React re-render.
 *
 * ## Two planes (the scene's P17)
 *
 * Geometry is rebuilt only when the MORPHOLOGY changes. Radius scaling,
 * colour and highlight are written into the instance buffers in place from a
 * `store.subscribe`, followed by `invalidate(INSTANCE_UPLOAD_FRAMES)` (see
 * `instanceUpload.ts` for why one frame is not enough) — the frame loop is on
 * demand, so nothing draws unless something changed.
 */

/** Pick radius floor (µm): thin dendrites stay clickable at arbor scale. */
const MIN_PICK_RADIUS = 1.5;

const CYLINDER = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
const SPHERE = new THREE.SphereGeometry(1, 12, 8);
const UP = new THREE.Vector3(0, 1, 0);

export type SectionHit = {
  section: MorphologySection;
  /** Index of the hit segment within the section. */
  segment: number;
  point: THREE.Vector3;
};

/** A hit on the pick mesh, resolved to its section. */
const resolveHit = (morphology: Morphology, e: ThreeEvent<PointerEvent | MouseEvent>): SectionHit | null => {
  const id = e.instanceId;
  if (id == null || id >= morphology.segmentCount) return null;
  const section = morphology.sections[morphology.segSection[id]];
  if (!section) return null;
  return { section, segment: morphology.segIndex[id], point: e.point.clone() };
};

/** Write segment `i`'s cylinder transform at `radius` into `matrix`. */
const segmentMatrix = (
  morphology: Morphology,
  i: number,
  radius: number,
  matrix: THREE.Matrix4,
  scratch: { a: THREE.Vector3; b: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 },
) => {
  const { a, b, q, s } = scratch;
  a.fromArray(morphology.segStart, i * 3);
  b.fromArray(morphology.segEnd, i * 3);
  const dir = b.sub(a);
  const length = dir.length();
  if (length < 1e-6) {
    // Zero-length segment: collapse it rather than orienting along NaN.
    matrix.makeScale(0, 0, 0);
    return;
  }
  q.setFromUnitVectors(UP, dir.divideScalar(length));
  a.addScaledVector(dir, length / 2);
  s.set(radius, length, radius);
  matrix.compose(a, q, s);
};

type Buffers = {
  tubes: THREE.InstancedMesh;
  joints: THREE.InstancedMesh;
  pick: THREE.InstancedMesh;
  /** Joint instance → section ordinal. */
  jointSection: Uint32Array;
  /** Joint instance → (section ordinal, point index), for its radius. */
  jointPoint: Uint32Array;
};

const buildBuffers = (morphology: Morphology): Buffers => {
  const jointCount = morphology.sections.reduce((n, s) => n + s.points.length, 0);
  const jointSection = new Uint32Array(jointCount);
  const jointPoint = new Uint32Array(jointCount);
  let j = 0;
  for (const s of morphology.sections) {
    for (let p = 0; p < s.points.length; p++, j++) {
      jointSection[j] = s.ordinal;
      jointPoint[j] = p;
    }
  }

  const material = new MeshStandardNodeMaterial({ roughness: 0.45, metalness: 0.05 });
  // At least one instance: a zero-count InstancedMesh still builds a pipeline
  // against a missing instance buffer.
  const tubes = new THREE.InstancedMesh(CYLINDER, material, Math.max(1, morphology.segmentCount));
  const joints = new THREE.InstancedMesh(SPHERE, material, Math.max(1, jointCount));
  tubes.count = morphology.segmentCount;
  joints.count = jointCount;

  const pickMaterial = new MeshBasicNodeMaterial();
  // Never drawn, still raycast: `Mesh.raycast` does not consult visibility of
  // the material, and the renderer skips an invisible material entirely.
  pickMaterial.visible = false;
  const pick = new THREE.InstancedMesh(CYLINDER, pickMaterial, Math.max(1, morphology.segmentCount));
  pick.count = morphology.segmentCount;

  // The colour attribute must exist before the first draw: the pipeline is
  // built against the attributes present then.
  const white = new THREE.Color(1, 1, 1);
  for (let i = 0; i < tubes.count; i++) tubes.setColorAt(i, white);
  for (let i = 0; i < joints.count; i++) joints.setColorAt(i, white);
  if (tubes.count === 0) tubes.setColorAt(0, white);
  if (joints.count === 0) joints.setColorAt(0, white);

  for (const mesh of [tubes, joints, pick]) {
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }
  return { tubes, joints, pick, jointSection, jointPoint };
};

const writeMatrices = (
  morphology: Morphology,
  buffers: Buffers,
  settings: MorphologyState["morphology"],
  hidden: ReadonlySet<string>,
) => {
  const { tubes, joints, pick, jointSection, jointPoint } = buffers;
  const drawn = (r: number) => Math.max(r * settings.radiusScale, settings.minRadius);
  // A hidden section collapses to nothing: not drawn, and not pickable.
  const isHidden = (ordinal: number) =>
    hidden.size > 0 && hidden.has(morphology.sections[ordinal].id);
  const matrix = new THREE.Matrix4();
  const scratch = {
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
    q: new THREE.Quaternion(),
    s: new THREE.Vector3(),
  };

  for (let i = 0; i < morphology.segmentCount; i++) {
    if (isHidden(morphology.segSection[i])) {
      matrix.makeScale(0, 0, 0);
      tubes.setMatrixAt(i, matrix);
      pick.setMatrixAt(i, matrix);
      continue;
    }
    const r = drawn(morphology.segRadius[i]);
    segmentMatrix(morphology, i, r, matrix, scratch);
    tubes.setMatrixAt(i, matrix);
    segmentMatrix(morphology, i, Math.max(r, MIN_PICK_RADIUS), matrix, scratch);
    pick.setMatrixAt(i, matrix);
  }
  for (let j = 0; j < joints.count; j++) {
    const section = morphology.sections[jointSection[j]];
    const p = jointPoint[j];
    const r = isHidden(section.ordinal) ? 0 : drawn(section.radii[p]);
    matrix.makeScale(r, r, r).setPosition(section.points[p]);
    joints.setMatrixAt(j, matrix);
  }
  for (const mesh of [tubes, joints, pick]) {
    mesh.instanceMatrix.needsUpdate = true;
    // The pick mesh's bounding sphere gates the raycast; recompute it.
    mesh.computeBoundingSphere();
  }
};

const writeColors = (
  morphology: Morphology,
  buffers: Buffers,
  baseColors: Float32Array,
  highlighted: ReadonlySet<string>,
) => {
  const { tubes, joints, jointSection } = buffers;
  const color = new THREE.Color();
  const highlight = new THREE.Color(HIGHLIGHT_COLOR);
  const colorOf = (ordinal: number): THREE.Color => {
    const section = morphology.sections[ordinal];
    if (section && highlighted.has(section.id)) return highlight;
    return color.fromArray(baseColors, ordinal * 3);
  };
  for (let i = 0; i < morphology.segmentCount; i++) {
    tubes.setColorAt(i, colorOf(morphology.segSection[i]));
  }
  for (let j = 0; j < joints.count; j++) joints.setColorAt(j, colorOf(jointSection[j]));
  if (tubes.instanceColor) tubes.instanceColor.needsUpdate = true;
  if (joints.instanceColor) joints.instanceColor.needsUpdate = true;
};

const highlightedIds = (state: MorphologyState, extra: readonly string[]): Set<string> => {
  const ids = new Set(Object.keys(state.panels));
  if (state.hoveredId) ids.add(state.hoveredId);
  for (const id of extra) ids.add(id);
  return ids;
};

const EMPTY: readonly string[] = [];
const NONE_HIDDEN: ReadonlySet<string> = new Set();

export type SectionTubesProps = {
  morphology: Morphology;
  /** One rgb triple per section ordinal (`sectionColors`). */
  baseColors: Float32Array;
  /** Sections to highlight besides the hovered and panel-open ones (the editor's selection). */
  highlight?: readonly string[];
  /** Sections not drawn at all (a zoomed-in render hiding its context). */
  hidden?: ReadonlySet<string>;
  onSectionClick?: (hit: SectionHit, e: ThreeEvent<MouseEvent>) => void;
  /** Fires on every move over a section — the editor's add-child cursor. */
  onSectionMove?: (hit: SectionHit | null) => void;
};

export const SectionTubes = ({
  morphology,
  baseColors,
  highlight = EMPTY,
  hidden = NONE_HIDDEN,
  onSectionClick,
  onSectionMove,
}: SectionTubesProps) => {
  const store = useMorphologyStoreApi();
  const invalidate = useThree((s) => s.invalidate);
  const visible = useMorphologyStore((s) => s.morphology.visible);
  const hovering = useMorphologyStore((s) => s.hoveredId !== null);
  useCursor(hovering && visible);

  const buffers = useMemo(() => buildBuffers(morphology), [morphology]);
  useEffect(
    () => () => {
      (buffers.tubes.material as THREE.Material).dispose();
      (buffers.pick.material as THREE.Material).dispose();
      buffers.tubes.dispose();
      buffers.joints.dispose();
      buffers.pick.dispose();
    },
    [buffers],
  );

  // Matrices: on mount and whenever the radius settings change.
  useLayoutEffect(() => {
    let last = store.getState().morphology;
    writeMatrices(morphology, buffers, last, hidden);
    invalidate(INSTANCE_UPLOAD_FRAMES);
    return store.subscribe((state) => {
      const next = state.morphology;
      if (next.radiusScale === last.radiusScale && next.minRadius === last.minRadius) return;
      last = next;
      writeMatrices(morphology, buffers, next, hidden);
      invalidate(INSTANCE_UPLOAD_FRAMES);
    });
  }, [store, morphology, buffers, hidden, invalidate]);

  // Colours: base colours are props (they change with colour-by), highlight
  // is store state — written in place either way.
  useLayoutEffect(() => {
    let lastKey = "";
    const sync = (state: MorphologyState) => {
      const ids = highlightedIds(state, highlight);
      const key = [...ids].sort().join("\u0000");
      if (key === lastKey) return;
      lastKey = key;
      writeColors(morphology, buffers, baseColors, ids);
      invalidate(INSTANCE_UPLOAD_FRAMES);
    };
    sync(store.getState());
    return store.subscribe(sync);
  }, [store, morphology, buffers, baseColors, highlight, invalidate]);

  const setHovered = (id: string | null) => store.getState().setHovered(id);

  return (
    <group visible={visible}>
      <primitive object={buffers.tubes} />
      <primitive object={buffers.joints} />
      {visible && (
        <primitive
          object={buffers.pick}
          onPointerMove={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            const hit = resolveHit(morphology, e);
            setHovered(hit?.section.id ?? null);
            onSectionMove?.(hit);
          }}
          onPointerOut={() => {
            setHovered(null);
            onSectionMove?.(null);
          }}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            const hit = resolveHit(morphology, e);
            if (hit) onSectionClick?.(hit, e);
          }}
        />
      )}
    </group>
  );
};
