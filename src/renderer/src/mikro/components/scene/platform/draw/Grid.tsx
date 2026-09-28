import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { createGridMaterial } from "./gridNodeMaterial";

export interface GridProps {
  cellSize?: number;
  sectionSize?: number;
  cellColor?: THREE.ColorRepresentation;
  sectionColor?: THREE.ColorRepresentation;
  cellThickness?: number;
  sectionThickness?: number;
  fadeDistance?: number;
  fadeStrength?: number;
  fadeFrom?: number;
  infiniteGrid?: boolean;
  /** Plane geometry size; drei defaults to a 1×1 plane. */
  args?: [number, number];
  position?: [number, number, number];
  "rotation-x"?: number;
}

/**
 * WebGPU-native drop-in for the subset of drei's `<Grid>` API used by
 * `ScaleGrid`. Backed by {@link createGridMaterial} (a TSL port of drei's grid
 * shader) instead of the raw `ShaderMaterial` the WebGPU backend rejects.
 */
export const Grid = ({
  cellSize = 0.5,
  sectionSize = 1,
  cellColor = "#000000",
  sectionColor = "#2080ff",
  cellThickness = 0.5,
  sectionThickness = 1,
  fadeDistance = 100,
  fadeStrength = 1,
  fadeFrom = 1,
  infiniteGrid = false,
  args,
  ...meshProps
}: GridProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { material, uniforms } = useMemo(
    () => createGridMaterial(infiniteGrid),
    [infiniteGrid],
  );

  useEffect(() => () => material.dispose(), [material]);

  // Push prop-derived values into the material uniforms.
  useEffect(() => {
    uniforms.cellSize.value = cellSize;
    uniforms.sectionSize.value = sectionSize;
    uniforms.cellColor.value.set(cellColor);
    uniforms.sectionColor.value.set(sectionColor);
    uniforms.cellThickness.value = cellThickness;
    uniforms.sectionThickness.value = sectionThickness;
    uniforms.fadeDistance.value = fadeDistance;
    uniforms.fadeStrength.value = fadeStrength;
    uniforms.fadeFrom.value = fadeFrom;
  }, [
    uniforms,
    cellSize,
    sectionSize,
    cellColor,
    sectionColor,
    cellThickness,
    sectionThickness,
    fadeDistance,
    fadeStrength,
    fadeFrom,
  ]);

  // Project the camera onto the grid plane each frame for the distance fade,
  // exactly as drei's <Grid> does.
  const plane = useMemo(() => new THREE.Plane(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const zero = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    plane.setFromNormalAndCoplanarPoint(up, zero).applyMatrix4(mesh.matrixWorld);
    plane.projectPoint(camera.position, uniforms.camProjPosition.value);
  });

  return (
    <mesh ref={meshRef} frustumCulled={false} {...meshProps}>
      <planeGeometry args={args} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};
