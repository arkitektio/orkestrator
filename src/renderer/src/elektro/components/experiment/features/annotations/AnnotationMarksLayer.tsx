import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/webgpu/Line2.js";
import { Line2NodeMaterial, MeshBasicNodeMaterial } from "three/webgpu";
import { bindField } from "@/lib/scene/stores/bindStore";
import { useBandValueMatrix } from "../../platform/marks/bandValueMatrix";
import { useSegmentGeometry, writeSegments } from "../../platform/marks/segmentGeometry";
import { useExperimentStore } from "../../platform/stores/experimentStore";
import { bandKey, useViewerStoreApi } from "../../platform/stores/viewerStore";
import type { AnnotationMarks, RowShapes } from "./annotationGeometry";
import { useAnnotationMarks, useAnnotationStore, useAnnotationStoreApi } from "./store/annotationSlice";

/**
 * An annotation layer: events as vertical lines, epochs as bands, across every
 * row — and value shapes (lines, paths, polygons) inside the trace rows they
 * were drawn over, each bound to its row's value map like the trace itself.
 * Selected marks (`annotationSlice.selectedAnnotationIds`) draw in the
 * selection colour.
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
const DEFAULT_SHAPE_COLOR = "#fcd34d";
const SELECTED_COLOR = "#ffffff";
// A tint, not a block: the traces under an epoch must still read clearly.
const EPOCH_OPACITY = 0.06;

/**
 * The selection, as a lookup — re-read whenever `selectionVersion` moves (a
 * scalar subscription; the id record itself is never subscribed to).
 */
const useSelection = (): ((annotationId: string) => boolean) => {
  const version = useAnnotationStore((s) => s.selectionVersion);
  const api = useAnnotationStoreApi();
  // `version` is the trigger; the record is read, not subscribed to.
  return useMemo(() => {
    const selected = api.getState().selectedAnnotationIds;
    return (id: string) => selected[id] === true;
  }, [version, api]);
};

export const AnnotationMarksLayer = ({ layerId }: { layerId: string }) => {
  const marks = useAnnotationMarks(layerId) ?? null;
  const timeOrigin = useExperimentStore((s) => s.timeOrigin);

  useEffect(() => {
    if (marks && marks.rowScoped > 0) {
      console.warn(
        `[experiment] ${marks.rowScoped} row-scoped annotation(s) in layer ${layerId} drawn by ` +
          "time extent only: no trace in this experiment reads the lens they were drawn over.",
      );
    }
  }, [marks, layerId]);

  const isSelected = useSelection();

  if (!marks) return null;
  return (
    <group>
      <EventLines marks={marks} timeOrigin={timeOrigin} isSelected={isSelected} />
      <EpochBands marks={marks} timeOrigin={timeOrigin} isSelected={isSelected} />
      {marks.rows.map((row) => (
        <RowShapeLines
          key={`${row.traceLayerId}:${row.channel}`}
          row={row}
          timeOrigin={timeOrigin}
          isSelected={isSelected}
        />
      ))}
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

type Selected = (annotationId: string) => boolean;

/** Per-vertex RGB for one segment of a given CSS colour. */
const segmentColor = (out: Float32Array, i: number, css: string, scratch: THREE.Color) => {
  scratch.setStyle(css);
  out.set([scratch.r, scratch.g, scratch.b, scratch.r, scratch.g, scratch.b], i * 6);
};

const EventLines = ({
  marks,
  timeOrigin,
  isSelected,
}: {
  marks: AnnotationMarks;
  timeOrigin: number;
  isSelected: Selected;
}) => {
  const invalidate = useThree((s) => s.invalidate);

  const material = useMemo(() => {
    const m = new Line2NodeMaterial();
    m.linewidth = 1.5;
    m.worldUnits = false;
    m.depthWrite = false;
    // Per-segment colours: an event's own colour, or the selection colour.
    m.vertexColors = true;
    m.color.setStyle("#ffffff");
    return m;
  }, []);

  // Sized for the event count, written in place (see `segmentGeometry.ts`).
  const geometry = useSegmentGeometry(marks.events.length, true);
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
    const colors = new Float32Array(marks.events.length * 6);
    const scratch = new THREE.Color();
    marks.events.forEach((event, i) => {
      const x = event.time - timeOrigin;
      pairs.set([x, 0, 0.5, x, -1, 0.5], i * 6);
      segmentColor(
        colors,
        i,
        isSelected(event.annotationId) ? SELECTED_COLOR : (event.color ?? DEFAULT_EVENT_COLOR),
        scratch,
      );
    });
    writeSegments(geometry, pairs, marks.events.length, colors);
    line.visible = true;
    invalidate();
  }, [marks, timeOrigin, isSelected, geometry, line, material, invalidate]);

  useRowStackScale(line);

  return <primitive object={line} renderOrder={3} />;
};

const EpochBands = ({
  marks,
  timeOrigin,
  isSelected,
}: {
  marks: AnnotationMarks;
  timeOrigin: number;
  isSelected: Selected;
}) => {
  const invalidate = useThree((s) => s.invalidate);

  const material = useMemo(() => {
    const m = new MeshBasicNodeMaterial();
    m.vertexColors = true;
    // A plain mesh: `transparent` is safe here. The viewport-copy trap it triggers
    // is specific to Line2NodeMaterial.
    m.transparent = true;
    m.opacity = EPOCH_OPACITY;
    m.depthWrite = false;
    // Both faces: the quads run right-then-DOWN in a y-up frame, i.e.
    // clockwise, which three culls as back faces under the default FrontSide —
    // every band was silently invisible. Winding is meaningless for a flat 2D
    // overlay, so do not depend on it.
    m.side = THREE.DoubleSide;
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
      color.setStyle(isSelected(epoch.id) ? SELECTED_COLOR : (epoch.color ?? DEFAULT_EPOCH_COLOR));
      for (let v = 0; v < 6; v++) colors.set([color.r, color.g, color.b], i * 18 + v * 3);
    });
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [marks, timeOrigin, isSelected]);

  const mesh = useMemo(() => {
    const m = new THREE.Mesh(geometry, material);
    m.matrixAutoUpdate = false;
    m.frustumCulled = false;
    return m;
  }, [geometry, material]);

  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    mesh.visible = marks.epochs.length > 0;
    invalidate();
  }, [mesh, marks, invalidate]);

  useRowStackScale(mesh);

  // Behind the traces: an epoch shades the time it covers, it does not sit on top.
  return <primitive object={mesh} renderOrder={1} />;
};

/**
 * One trace row's value shapes, as segments in `(time − origin, value)` —
 * the trace's own units — placed by the row's value map (`useBandValueMatrix`),
 * so a shape stays glued to the trace through a relayout or a rescale.
 */
const RowShapeLines = ({
  row,
  timeOrigin,
  isSelected,
}: {
  row: RowShapes;
  timeOrigin: number;
  isSelected: Selected;
}) => {
  const invalidate = useThree((s) => s.invalidate);

  const segments = useMemo(() => {
    let count = 0;
    for (const shape of row.shapes) count += shape.closed ? shape.times.length : shape.times.length - 1;
    const pairs = new Float32Array(count * 6);
    const colors = new Float32Array(count * 6);
    const scratch = new THREE.Color();
    let i = 0;
    for (const shape of row.shapes) {
      const css = isSelected(shape.id) ? SELECTED_COLOR : (shape.color ?? DEFAULT_SHAPE_COLOR);
      const n = shape.times.length;
      const edges = shape.closed ? n : n - 1;
      for (let e = 0; e < edges; e++) {
        const j = (e + 1) % n;
        pairs.set(
          [shape.times[e] - timeOrigin, shape.values[e], 0.6, shape.times[j] - timeOrigin, shape.values[j], 0.6],
          i * 6,
        );
        segmentColor(colors, i, css, scratch);
        i++;
      }
    }
    return { pairs, colors, count };
  }, [row, timeOrigin, isSelected]);

  const material = useMemo(() => {
    const m = new Line2NodeMaterial();
    m.linewidth = 2;
    m.worldUnits = false;
    m.depthWrite = false;
    m.vertexColors = true;
    m.color.setStyle("#ffffff");
    return m;
  }, []);
  useEffect(() => () => material.dispose(), [material]);

  const geometry = useSegmentGeometry(segments.count, true);
  const line = useMemo(() => {
    const l = new Line2(geometry as never, material as never);
    l.matrixAutoUpdate = false;
    l.frustumCulled = false;
    l.visible = false;
    return l;
  }, [geometry, material]);

  // Upload before the frame that draws it (see TraceLines).
  useLayoutEffect(() => {
    writeSegments(geometry, segments.pairs, segments.count, segments.colors);
    invalidate();
  }, [segments, geometry, invalidate]);

  useBandValueMatrix(line, bandKey(row.traceLayerId, row.channel), segments.count > 0);

  // Over the trace it annotates.
  return <primitive object={line} renderOrder={4} />;
};
