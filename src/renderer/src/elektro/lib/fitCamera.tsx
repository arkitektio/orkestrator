import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Minimal structural shape shared by the editor's and the read-only renderer's
 * processed segments: a section (to know if it's a root) plus its endpoints.
 */
export interface FitSegment {
  start: THREE.Vector3;
  end: THREE.Vector3;
  section: { parent?: { parent: string } | null };
}

const isRootSection = (section: FitSegment["section"]) => !section.parent;

/**
 * Collect every geometry point (for the enclosing radius) and the centroid of
 * all root-node positions across all cells (the rotation center). A "root node"
 * is the start of any section with no parent connection.
 */
export const computeRootCentroidFit = (segments: FitSegment[]) => {
  const points: THREE.Vector3[] = [];
  const rootStarts: THREE.Vector3[] = [];

  for (const seg of segments) {
    points.push(seg.start, seg.end);
    if (isRootSection(seg.section)) rootStarts.push(seg.start);
  }

  // Fall back to all points if (somehow) there are no roots, so we still center
  // on something sensible rather than the origin.
  const basis = rootStarts.length > 0 ? rootStarts : points;
  const target = new THREE.Vector3();
  basis.forEach(p => target.add(p));
  if (basis.length > 0) target.multiplyScalar(1 / basis.length);

  return { points, target };
};

/**
 * Frames a neuron so the whole model stays in view while orbiting around a fixed
 * rotation center (`target`, the centroid of all root nodes). Fits against the
 * narrower of the vertical/horizontal FOV so it never clips regardless of aspect
 * ratio, and preserves the current view direction so re-fitting (e.g. while
 * editing) doesn't yank the camera's orientation around.
 */
export const FitCamera = ({
  points,
  target,
  margin = 1.4,
  refit = 0,
}: {
  points: THREE.Vector3[];
  target: THREE.Vector3;
  margin?: number;
  /**
   * Bump to re-frame the same geometry on demand (the F key). Part of the
   * dedupe key below, so an unchanged model still re-fits when asked to.
   */
  refit?: number;
}) => {
  const camera = useThree(s => s.camera);
  // OrbitControls registers itself here via `makeDefault`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controls = useThree(s => s.controls) as any;
  const lastKey = useRef<string>("");

  useEffect(() => {
    if (!points.length || !controls) return;

    // Enclosing radius: the farthest geometry point from the rotation center,
    // so the entire model fits inside a sphere centered on `target`.
    let radius = 0;
    for (const p of points) radius = Math.max(radius, p.distanceTo(target));
    radius = Math.max(radius, 1);

    const key = `${target.x.toFixed(1)}|${target.y.toFixed(1)}|${target.z.toFixed(1)}|${radius.toFixed(1)}|${refit}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    const persp = camera as THREE.PerspectiveCamera;
    const vFov = ((persp.fov ?? 50) * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (persp.aspect || 1));
    const fitFov = Math.min(vFov, hFov);
    const distance = (radius * margin) / Math.sin(fitFov / 2);

    // Preserve current viewing direction; only adjust distance and target.
    const dir = camera.position.clone().sub(controls.target);
    if (dir.lengthSq() < 1e-6) dir.set(1, 1, 1);
    dir.normalize();

    camera.position.copy(target.clone().add(dir.multiplyScalar(distance)));
    persp.near = Math.max(distance / 100, 0.01);
    persp.far = distance * 100;
    persp.updateProjectionMatrix();

    controls.target.copy(target);
    controls.update();
  }, [points, target, margin, refit, camera, controls]);

  return null;
};
