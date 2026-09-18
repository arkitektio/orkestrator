import { useRef, useState } from "react";
import { toast } from "sonner";
import { AnnotationKind, useCreateExperimentAnnotationMutation } from "@/elektro/api/graphql";
import { MIN_BOX_PX } from "../../platform/camera/dragIntent";
import { pixelAtTime, timeAtPixel } from "../../platform/camera/rangeToCamera";
import { axisNamesOf, timeAxisName } from "../../platform/coords/timeAxis";
import {
  useExperimentStore,
  useExperimentStoreApi,
} from "../../platform/stores/experimentStore";
import { useRangeStore, useRangeStoreApi } from "../../platform/stores/rangeStore";
import { useViewerStore } from "../../platform/stores/viewerStore";

/**
 * Drawing events and epochs onto the experiment.
 *
 * Mounted over the canvas only in ANNOTATE mode; in EXPLORE it renders nothing
 * and the camera owns the pointer. A click drops an EVENT; a drag spans an EPOCH,
 * previewed live.
 *
 * Draws onto the EXPERIMENT (`createAnnotation(experiment:)`), which mints the
 * experiment's own collection on first use: its coordinate system copies the
 * world's axes with an identity registration, so a vertex is written directly in
 * world coordinates — time in the world's time slot. The first draw also mints an
 * annotation VIEW, which arrives as a reconcile, not a rebuild (the provider's
 * contract), so the canvas survives it.
 *
 * Time-scoped only. A row-scoped shape (a baseline-to-peak line) would need the
 * annotation to say which view's row its value belongs to, and the schema has no
 * field for that — see `annotationGeometry.ts`.
 */
export const AnnotationDrawer = () => {
  const mode = useViewerStore((s) => s.interactionMode);
  const annotatable = useExperimentStore((s) => s.annotatable);
  if (mode !== "ANNOTATE" || !annotatable) return null;
  return <DrawSurface />;
};

/**
 * One gesture, two marks: a CLICK drops an event, a DRAG spans an epoch. The same
 * pixel threshold that separates a click from a zoom box in EXPLORE separates them
 * here, so the two modes feel alike under the hand.
 */
const DrawSurface = () => {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const rangeApi = useRangeStoreApi();
  const experimentApi = useExperimentStoreApi();
  const experimentId = useExperimentStore((s) => s.experimentId);
  const window = useRangeStore((s) => s.committedRange);
  const [drag, setDrag] = useState<{ from: number; to: number; startX: number } | null>(null);

  const [create] = useCreateExperimentAnnotationMutation({
    // The first draw mints a collection AND a view; refetching the scene is what
    // brings both into the provider, which folds them in without a rebuild.
    refetchQueries: ["GetExperimentScene"],
  });

  const timeAt = (clientX: number): number => {
    const el = surfaceRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return timeAtPixel(clientX - rect.left, rect.width, rangeApi.getState().liveRange);
  };

  /** A world-coordinate vertex: the time in the world's time slot, 0 elsewhere. */
  const vertexAt = (time: number): number[] => {
    const world = experimentApi.getState().world;
    const axes = axisNamesOf(world);
    const t = timeAxisName(world);
    if (!t || axes.length === 0) return [time];
    return axes.map((axis) => (axis === t ? time : 0));
  };

  const submit = (kind: AnnotationKind, vectors: number[][]) => {
    void create({
      variables: { input: { experiment: experimentId, kind, vectors } },
    }).catch((error: unknown) => {
      toast.error(
        `Could not save the ${kind === AnnotationKind.Event ? "event" : "epoch"}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    const t = timeAt(event.clientX);
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    setDrag({ from: t, to: t, startX: event.clientX });
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag) return;
    setDrag({ ...drag, to: timeAt(event.clientX) });
  };

  const onPointerUp = (event: React.PointerEvent) => {
    if (!drag) return;
    const finished = drag;
    setDrag(null);
    // Under the threshold it was a click: an instant, at where it was pressed.
    if (Math.abs(event.clientX - finished.startX) < MIN_BOX_PX) {
      submit(AnnotationKind.Event, [vertexAt(finished.from)]);
      return;
    }
    const start = Math.min(finished.from, finished.to);
    const end = Math.max(finished.from, finished.to);
    if (end > start) submit(AnnotationKind.Epoch, [vertexAt(start), vertexAt(end)]);
  };

  const width = surfaceRef.current?.clientWidth ?? 0;
  const preview =
    drag && width > 0 && drag.to !== drag.from
      ? {
          left: pixelAtTime(Math.min(drag.from, drag.to), width, window),
          right: pixelAtTime(Math.max(drag.from, drag.to), width, window),
        }
      : null;

  return (
    <div
      ref={surfaceRef}
      className="absolute inset-x-0 top-0 bottom-12 z-10 cursor-crosshair"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDrag(null)}
    >
      {preview && (
        <div
          className="pointer-events-none absolute inset-y-0 bg-amber-400/20 ring-1 ring-amber-400/60"
          style={{ left: preview.left, width: Math.max(1, preview.right - preview.left) }}
        />
      )}
    </div>
  );
};
