import { Flag, SquareDashed, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDeleteExperimentAnnotationMutation } from "@/elektro/api/graphql";
import { formatValue } from "../../platform/probe/formatValue";
import { useRangeStoreApi } from "../../platform/stores/rangeStore";
import { useAnnotationStore, useAnnotationStoreApi } from "./store/annotationSlice";

/**
 * Every event and epoch on the timeline, in time order, each a jump target.
 *
 * Built from the same `annotationMarks` the layer draws with, so a row here is
 * exactly a mark on the canvas. Jumping is a deliberate move and goes into the zoom
 * history (undo takes you back to where you were).
 */
export const AnnotationsPanel = () => {
  // A scalar (P17): the marks record is read inside the memo, not subscribed to.
  const version = useAnnotationStore((s) => s.annotationMarksVersion);
  const marksApi = useAnnotationStoreApi();
  const rangeApi = useRangeStoreApi();
  const [remove] = useDeleteExperimentAnnotationMutation({
    refetchQueries: ["GetExperimentScene"],
  });

  const items = useMemo(() => {
    const out: {
      key: string;
      annotationId: string;
      kind: "event" | "epoch";
      name: string | null;
      start: number;
      end: number;
      color: string | null;
    }[] = [];
    for (const marks of Object.values(marksApi.getState().annotationMarks)) {
      for (const e of marks.events) {
        out.push({
          key: `e:${e.id}`,
          // EVENTS expand to `${id}:${i}`; the deletable thing is the annotation.
          annotationId: e.id.split(":")[0],
          kind: "event",
          name: e.name,
          start: e.time,
          end: e.time,
          color: e.color,
        });
      }
      for (const p of marks.epochs) {
        out.push({
          key: `p:${p.id}`,
          annotationId: p.id,
          kind: "epoch",
          name: p.name,
          start: p.start,
          end: p.end,
          color: p.color,
        });
      }
    }
    return out.sort((a, b) => a.start - b.start);
  }, [version, marksApi]);

  const jump = (start: number, end: number) => {
    const { committedRange } = rangeApi.getState();
    const width = committedRange.end - committedRange.start;
    // An instant is centred at the current zoom; a span is framed with a margin.
    const target =
      end > start
        ? { start: start - (end - start) * 0.1, end: end + (end - start) * 0.1 }
        : { start: start - width / 2, end: start + width / 2 };
    rangeApi.getState().jumpTo(target);
  };

  if (items.length === 0) {
    return (
      <div className="p-4 text-xs text-muted-foreground">
        No events or epochs yet. Pick the flag or the dashed box in the viewer's
        controls to mark some.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 overflow-y-auto p-3">
      {items.map((item) => (
        <div
          key={item.key}
          className="group flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent/40"
        >
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            onClick={() => jump(item.start, item.end)}
          >
            {item.kind === "event" ? (
              <Flag className="h-3 w-3 shrink-0" style={{ color: item.color ?? "#fbbf24" }} />
            ) : (
              <SquareDashed className="h-3 w-3 shrink-0" style={{ color: item.color ?? "#fbbf24" }} />
            )}
            <span className="truncate text-xs">{item.name ?? (item.kind === "event" ? "Event" : "Epoch")}</span>
            <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground">
              {item.kind === "event"
                ? formatValue(item.start)
                : `${formatValue(item.start)}–${formatValue(item.end)}`}
            </span>
          </button>
          <Button
            size="icon-xs"
            variant="ghost"
            className="opacity-0 group-hover:opacity-100"
            title="Delete this mark"
            onClick={() =>
              void remove({ variables: { id: item.annotationId } }).catch((error: unknown) =>
                toast.error(
                  `Could not delete: ${error instanceof Error ? error.message : String(error)}`,
                ),
              )
            }
          >
            <Trash2 />
          </Button>
        </div>
      ))}
    </div>
  );
};
