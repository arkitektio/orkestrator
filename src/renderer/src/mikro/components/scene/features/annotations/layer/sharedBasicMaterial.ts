import { useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * Ref-counted `MeshBasicMaterial`s shared by value, for the per-shape 3D
 * meshes (`AnnotationShape`'s wireframe box/ellipsoid + fill) that no batch
 * absorbs: a thousand boxes in one color become ONE material (one pipeline
 * state) instead of two per shape. The flat shapes' interiors and outlines
 * are merged batches and never come through here.
 *
 * Lookup happens in render (`peekBasicMaterial`, create-on-miss); the count
 * is taken in an effect (`retain` / `release`), so a render React discards
 * leaks nothing but a cached material the next shape of that style reuses.
 * The last release disposes. A material released and then retained again
 * (unmount + mount in one commit) is re-registered, not re-created.
 */

export type BasicMaterialSpec = {
  color: string;
  opacity: number;
  /** Wireframe stroke (single-sided); else a double-sided transparent fill. */
  wireframe: boolean;
};

export const basicMaterialKey = (spec: BasicMaterialSpec): string =>
  `${spec.color}|${spec.opacity}|${spec.wireframe ? "w" : "f"}`;

const byKey = new Map<string, THREE.MeshBasicMaterial>();
const refs = new Map<THREE.MeshBasicMaterial, number>();

/** The cached material for `spec`, created on miss. Takes no reference. */
export function peekBasicMaterial(spec: BasicMaterialSpec): THREE.MeshBasicMaterial {
  const key = basicMaterialKey(spec);
  const cached = byKey.get(key);
  if (cached) return cached;
  const material = new THREE.MeshBasicMaterial({
    color: spec.color,
    transparent: true,
    opacity: spec.opacity,
    wireframe: spec.wireframe,
    side: spec.wireframe ? THREE.FrontSide : THREE.DoubleSide,
  });
  byKey.set(key, material);
  return material;
}

export function retainBasicMaterial(key: string, material: THREE.MeshBasicMaterial): void {
  refs.set(material, (refs.get(material) ?? 0) + 1);
  if (!byKey.has(key)) byKey.set(key, material);
}

export function releaseBasicMaterial(key: string, material: THREE.MeshBasicMaterial): void {
  const remaining = (refs.get(material) ?? 0) - 1;
  if (remaining > 0) {
    refs.set(material, remaining);
    return;
  }
  refs.delete(material);
  if (byKey.get(key) === material) byKey.delete(key);
  material.dispose();
}

/** Test seam: the live reference count of a material. */
export const basicMaterialRefs = (material: THREE.MeshBasicMaterial): number =>
  refs.get(material) ?? 0;

/** The shared material for `spec`, held for as long as the caller is mounted. */
export function useSharedBasicMaterial(spec: BasicMaterialSpec): THREE.MeshBasicMaterial {
  const key = basicMaterialKey(spec);
  // Keyed on the VALUE: `spec` is a fresh object every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const material = useMemo(() => peekBasicMaterial(spec), [key]);
  useEffect(() => {
    retainBasicMaterial(key, material);
    return () => releaseBasicMaterial(key, material);
  }, [key, material]);
  return material;
}
