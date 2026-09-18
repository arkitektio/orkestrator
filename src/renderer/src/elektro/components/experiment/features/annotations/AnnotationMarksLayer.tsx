import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/webgpu/Line2.js";
import { Line2NodeMaterial, MeshBasicNodeMaterial } from "three/webgpu";
import { bindField } from "@/lib/scene/stores/bindStore";
import { useSegmentGeometry, writeSegments } from "../../platform/marks/segmentGeometry";
import { useExperimentStore } from "../../platform/stores/experimentStore";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";
import type { AnnotationMarks } from "./annotationGeometry";
import { useAnnotationMarks } from "./store/annotationSlice";

/**
 * An annotation layer: events as vertical lines, epochs as bands, across every row.
 *
 * Geometry is built in a unit-height space — every mark spans y ∈ [0, −1] — and the
 * OBJECT MATRIX scales it to the row stack. A relayout (a layer hidden, the layout
 * mode switched) is then one matrix write rather than a rebuild of every mark.
 *
 * Reads the RAW annotation-layer fragment: it is drawn straight from its
 * collection, which is exactly why the card registry marks its card
 * `source: "fragment"`.
 */

const DEFAULT_EVENT_COLOR = "#fbbf24";
const DEFAULT_EPOCH_COLOR = "#fbbf24";
const EPOCH_OPACITY = 0.14;

export const AnnotationMarksLayer = ({ layerId }: { layerId: string }) => {
  const marks = useAnnotationMarks(layerId) ?? null;
  const timeOrigin = useExperimentStore((s) => s.timeOrigin);

  useEffect(() => {
    if (marks && marks.rowScoped > 0) {
      console.warn(
        `[experiment] ${marks.rowScoped} row-scoped annotation(s) in layer ${layerId} drawn by ` +
          "time extent only: the schema names no layer for their value axis.",
      );
    }
  }, [marks, layerId]);

  if (!marks) return null;
  return (
    <group>
      <EventLines marks={marks} timeOrigin={timeOrigin} />
      <EpochBands marks={marks} timeOrigin={timeOrigin} />
    </group>
  );
};

/** Scale a unit-height mark group to the current row stack, imperatively. */
const useRowStackScale = (object: THREE.Object3D) => {
  const invalidate = useThree((s) => s.invalidate);
  const viewerApi = useViewerStoreApi();
  useEffect(
    () =>
      bindField(
        viewerApi,
        (s) => s.rowCount,
        (rowCount) => {
          object.matrix.makeScale(1, Math.max(1, rowCount), 1);
          object.matrixWorldNeedsUpdate = true;
          invalidate();
        },
      ),
    [object, viewerApi, invalidate],
  );
};

const EventLines = ({ marks, timeOrigin }: { marks: AnnotationMarks; timeOrigin: number }) => {
  const invalidate = useThree((s) => s.invalidate);

  const material = useMemo(() => {
    const m = new Line2NodeMaterial();
    m.linewidth = 1.5;
    m.worldUnits = false;
    m.depthWrite = false;
    // One colour per line segment would need a colour attribute; events are few and
    // usually uncoloured, so the collection-wide colour is the honest default.
    m.color.setStyle(marks.events.find((e) => e.color)?.color ?? DEFAULT_EVENT_COLOR);
    return m;
  }, [marks]);

  // Sized for the event count, written in place (see `segmentGeometry.ts`).
  const geometry = useSegmentGeometry(marks.events.length, false);
  const line = useMemo(() => {
    const l = new Line2(geometry as never, material as never);
    l.matrixAutoUpdate = false;
    l.frustumCulled = false;
    return l;
  }, [geometry, material]);

  useEffect(() => () => material.dispose(), [material]);

  useLayoutEffect(() => {
    if (marks.events.length === 0) {
      line.visible = false;
      invalidate();
      return;
    }
    const pairs = new Float32Array(marks.events.length * 6);
    marks.events.forEach((event, i) => {
      const x = event.time - timeOrigin;
      pairs.set([x, 0, 0.5, x, -1, 0.5], i * 6);
    });
    writeSegments(geometry, pairs, marks.events.length);
    line.visible = true;
    invalidate();
  }, [marks, timeOrigin, geometry, line, material, invalidate]);

  useRowStackScale(line);

  return <primitive object={line} renderOrder={3} />;
};

const EpochBands = ({ marks, timeOrigin }: { marks: AnnotationMarks; timeOrigin: number }) => {
  const invalidate = useThree((s) => s.invalidate);

  const material = useMemo(() => {
    const m = new MeshBasicNodeMaterial();
    m.vertexColors = true;
    // A plain mesh: `transparent` is safe here. The viewport-copy trap it triggers
    // is specific to Line2NodeMaterial.
    m.transparent = true;
    m.opacity = EPOCH_OPACITY;
    m.depthWrite = false;
    return m;
  }, []);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(marks.epochs.length * 6 * 3);
    const colors = new Float32Array(marks.epochs.length * 6 * 3);
    const color = new THREE.Color();
    marks.epochs.forEach((epoch, i) => {
      const x0 = epoch.start - timeOrigin;
      // A zero-width epoch would be invisible; give it a hairline.
      const x1 = Math.max(epoch.end - timeOrigin, x0 + 1e-9);
      // Two triangles, y ∈ [0, −1], scaled to the stack by the object matrix.
      positions.set(
        [x0, 0, 0, x1, 0, 0, x1, -1, 0, x0, 0, 0, x1, -1, 0, x0, -1, 0],
        i * 18,
      );
      color.setStyle(epoch.color ?? DEFAULT_EPOCH_COLOR);
      for (let v = 0; v < 6; v++) colors.set([color.r, color.g, color.b], i * 18 + v * 3);
    });
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [marks, timeOrigin]);

  const mesh = useMemo(() => {
    const m = new THREE.Mesh(geometry, material);
    m.matrixAutoUpdate = false;
    m.frustumCulled = false;
    return m;
  }, [geometry, material]);

  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    mesh.visible = marks.epochs.length > 0;
    invalidate();
  }, [mesh, marks, invalidate]);

  useRowStackScale(mesh);

  // Behind the traces: an epoch shades the time it covers, it does not sit on top.
  return <primitive object={mesh} renderOrder={1} />;
};
