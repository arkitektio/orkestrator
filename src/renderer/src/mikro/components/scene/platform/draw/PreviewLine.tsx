import { forwardRef, useEffect, useImperativeHandle, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/webgpu/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { Line2NodeMaterial } from "three/webgpu";
import { writeLineDistances, writePolylinePairs } from "@/core/lib/scene/gpu/lineBuffer";
import type { OutlinePoint } from "../model/geometry";

/**
 * A rubber-band border the drawers rewrite at pointer cadence, without React.
 *
 * Why not a ref on `platform/draw/Line`: that component early-returns `null` below
 * two points (a segment-less geometry is a real WGSL compile error, not a
 * nicety), so a forwarded handle would detach exactly when a polygon preview
 * drops to one vertex. It also has no reason to carry the six things a preview
 * needs — preallocated buffers, no frustum culling, no depth test, a render
 * order, a `visible` toggle, and never setting `transparent`.
 *
 * So this mounts for the whole tool session and HIDES itself below two points.
 * The handle is stable for the component's life, and the geometry is seeded once
 * at mount so `instanceStart`/`instanceEnd` exist before the first draw — the
 * same invariant `Line`'s early return enforces, reached by never dropping below
 * two points rather than by unmounting.
 */

export interface PreviewLineHandle {
  /**
   * Rewrite the border. Mutates the existing buffers when the point COUNT is
   * unchanged (the pointer-move path: no allocation, one buffer write);
   * reallocates via `setPositions` when it changes (the click path).
   */
  setPoints(points: readonly OutlinePoint[]): void;
  /** Hide without clearing — the idle state between gestures. */
  clear(): void;
}

export interface PreviewLineProps {
  color: THREE.ColorRepresentation;
  lineWidth?: number;
  dashed?: boolean;
  dashSize?: number;
  gapSize?: number;
  renderOrder?: number;
  /** Points the buffers are preallocated for. Larger just costs a little memory. */
  capacity?: number;
}

/** An ellipse is 49 points; polygons realistically stay well under this. */
const DEFAULT_CAPACITY = 256;

export const PreviewLine = forwardRef<PreviewLineHandle, PreviewLineProps>(
  (
    {
      color,
      lineWidth = 2,
      dashed = false,
      dashSize = 3,
      gapSize = 2,
      renderOrder = 10,
      capacity = DEFAULT_CAPACITY,
    },
    ref,
  ) => {
    const invalidate = useThree((s) => s.invalidate);

    const { line, geometry, material } = useMemo(() => {
      const geo = new LineGeometry();
      const mat = new Line2NodeMaterial();

      // Configured once and never mutated. `Line`'s declarative path sets
      // `needsUpdate` on every prop change, which on a NodeMaterial bumps the
      // version and re-derives the render-object cache key — and `dashed`
      // changes the compiled program outright. A preview that restyled itself
      // mid-gesture would recompile per frame, so styling variants get their own
      // PreviewLine instead.
      mat.color = new THREE.Color(color);
      mat.linewidth = lineWidth;
      mat.dashed = dashed;
      mat.dashSize = dashSize;
      mat.gapSize = gapSize;
      // Draw over the volumes: at a slice z of ~0, any volume spanning real
      // depth would otherwise swallow the border in 3D.
      mat.depthTest = false;
      mat.depthWrite = false;

      // Preallocate for `capacity` points so ordinary drawing never reallocates.
      // `setPositions` takes POSITIONS (3 floats per point) and expands them to
      // the interleaved pair layout itself, so the input is `capacity * 3` —
      // which yields exactly `pairBufferLength(capacity)` floats of pairs.
      // `visible = false` keeps the zero-length seed segments (whose direction
      // normalizes to NaN) away from the shader until real points arrive.
      geo.setPositions(new Float32Array(capacity * 3));

      const obj = new Line2(geo, mat);
      // Dashing reads cumulative arc length per fragment. If the attributes are
      // missing entirely the shader falls back to 0.0 and renders a silently
      // UNDASHED line rather than crashing — so seed them once, up front.
      if (dashed) obj.computeLineDistances();
      // Only `setPositions` refreshes the bounding sphere, so in-place writes
      // leave it stale — and a stale sphere would cull the rubber band the
      // moment it grew past its press-time extent. It is one object, always
      // under the cursor; culling it could only ever save one draw call.
      obj.frustumCulled = false;
      obj.renderOrder = renderOrder;
      obj.visible = false;

      return { line: obj, geometry: geo, material: mat };
      // Styling is mount-time only, by design (see above).
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(
      () => () => {
        geometry.dispose();
        material.dispose();
      },
      [geometry, material],
    );

    useImperativeHandle(
      ref,
      (): PreviewLineHandle => ({
        setPoints(points) {
          if (points.length < 2) {
            if (line.visible) {
              line.visible = false;
              invalidate();
            }
            return;
          }

          const start = geometry.attributes.instanceStart as
            | THREE.InterleavedBufferAttribute
            | undefined;
          const segments = points.length - 1;
          const pairs = start?.data.array as Float32Array | undefined;
          // -1 means the preallocation is too small; nothing was written.
          const written = pairs ? writePolylinePairs(pairs, points) : -1;

          if (!start || !pairs || written < 0) {
            // Outgrew the preallocation — rare, and only ever at click cadence.
            geometry.setPositions(points.flatMap((p) => [p[0], p[1], p[2]]));
            if (dashed) line.computeLineDistances();
          } else {
            start.data.needsUpdate = true;
            // The pair buffer holds `capacity` segments regardless of how many
            // we just wrote, so the draw range has to be narrowed by hand —
            // otherwise the untouched tail renders as stale segments.
            geometry.instanceCount = segments;

            if (dashed) {
              const distances = geometry.attributes.instanceDistanceStart as
                | THREE.InterleavedBufferAttribute
                | undefined;
              if (distances) {
                writeLineDistances(
                  distances.data.array as Float32Array,
                  pairs,
                  segments,
                );
                distances.data.needsUpdate = true;
              }
            }
          }

          line.visible = true;
          invalidate(); // the Canvas is frameloop="demand"
        },

        clear() {
          if (!line.visible) return;
          line.visible = false;
          invalidate();
        },
      }),
      [line, geometry, dashed, invalidate],
    );

    // Mounted unconditionally — visibility, not mounting, is what toggles it.
    return <primitive object={line} />;
  },
);

PreviewLine.displayName = "PreviewLine";
