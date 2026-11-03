import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/webgpu/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { Line2NodeMaterial } from "three/webgpu";

import { swapGeometry } from "@/core/data/scene/gpu/swapGeometry";
import { useDrawEffect } from "@/core/data/scene/stores/useDrawEffect";
import { ACTIVE_STROKE, DERIVED_STROKE } from "../annotationStyle";

/** The dark band under a selected outline: amber alone vanishes on a red or
 * yellow channel, a dark rim reads on any of them. */
const HALO_COLOR = "#0a0a0a";
const HALO_WIDTH = 7;
const CORE_WIDTH = 3;

/**
 * The selected shapes' outlines again, wider and on top: a dark halo with the
 * selection color over it. The merged batches only RE-TINT on a click (their
 * geometry is selection-free by contract), so this is where a selection gets
 * its weight — rebuilt from the few selected shapes, never the collection.
 *
 * No handlers: it costs no raycast, and a click on it falls through to the
 * batch below, which picks as before. No depth test, so a selection is never
 * lost inside a volume. Mounted only with segments to draw (a segment-less
 * geometry is a WGSL compile error).
 *
 * `positions` is the batch layout: 6 floats per segment (xyz, xyz).
 */
export type HaloColors = { halo: string; core: string };
export const SELECTION_HALO: HaloColors = { halo: HALO_COLOR, core: ACTIVE_STROKE };
/** What was made from the shape whose card is open (`lib/annotations/derivedShapes`). */
export const DERIVED_HALO: HaloColors = { halo: HALO_COLOR, core: DERIVED_STROKE };

export const SelectionHalo = ({ positions, colors = SELECTION_HALO }: { positions: Float32Array; colors?: HaloColors }) => {
  const lines = useMemo(() => {
    const make = (color: string, width: number, renderOrder: number) => {
      const material = new Line2NodeMaterial();
      material.color = new THREE.Color(color);
      material.linewidth = width;
      material.depthTest = false;
      material.depthWrite = false;
      const line = new LineSegments2(new LineSegmentsGeometry(), material);
      line.renderOrder = renderOrder;
      line.raycast = () => {};
      return line;
    };
    // Above the drawers' previews (renderOrder 10) is not wanted: those are
    // what the user is doing right now. Just above the batches is enough.
    return [make(colors.halo, HALO_WIDTH, 5), make(colors.core, CORE_WIDTH, 6)] as const;
  }, [colors]);

  useEffect(
    () => () => {
      for (const line of lines) {
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      }
    },
    [lines],
  );

  // A NEW geometry per selection, as the batches do (`swapGeometry`):
  // re-uploading into a drawn one leaves the old vertex buffer bound.
  useDrawEffect(() => {
    for (const line of lines) {
      const geometry = new LineSegmentsGeometry();
      geometry.setPositions(positions);
      swapGeometry(line, geometry);
    }
  }, [positions, lines]);

  return (
    <>
      <primitive object={lines[0]} />
      <primitive object={lines[1]} />
    </>
  );
};

/** The segments of the given batches, end to end — the halo's input. */
export const concatSegments = (batches: readonly { positions: Float32Array }[]): Float32Array => {
  if (batches.length === 1) return batches[0].positions;
  const out = new Float32Array(batches.reduce((n, batch) => n + batch.positions.length, 0));
  let at = 0;
  for (const batch of batches) {
    out.set(batch.positions, at);
    at += batch.positions.length;
  }
  return out;
};
