import { Flag, Minus, Pencil, Pentagon, SquareDashed, Trash2, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDeleteExperimentAnnotationMutation } from "@/elektro/api/graphql";
import { evictAnnotation } from "./annotationCache";
import { formatValue } from "../../platform/probe/formatValue";
import { useRangeStoreApi } from "../../platform/stores/rangeStore";
import {
  useAnnotationStore,
  useAnnotationStoreApi,
  useIsAnnotationSelected,
} from "./store/annotationSlice";

type ItemKind = "event" | "epoch" | "LINE" | "PATH" | "POLYGON";

type Item = {
  key: string;
  annotationId: string;
  kind: ItemKind;
  name: string | null;
  start: number;
  end: number;
  color: string | null;
};

const ICONS: Record<ItemKind, LucideIcon> = {
  event: Flag,
  epoch: SquareDashed,
  LINE: Minus,
  PATH: Pencil,
  POLYGON: Pentagon,
};

const FALLBACK_NAMES: Record<ItemKind, string> = {
  event: "Event",
  epoch: "Epoch",
  LINE: "Line",
  PATH: "Path",
  POLYGON: "Polygon",
};

/**
 * Every mark on the timeline — events, epochs and the value shapes drawn over
 * trace rows — in time order, each a jump target.
 *
 * Built from the same `annotationMarks` the layer draws with, so a row here is
 * exactly a mark on the canvas. Clicking one SELECTS it (shift adds, as on the
 * canvas) and jumps to it; the canvas selection is highlighted here and scrolled
 * into view. Jumping is a deliberate move and goes into the zoom history (undo
 * takes you back to where you were).
 */
export const AnnotationsPanel = () => {
  // A scalar (P17): the marks record is read inside the memo, not subscribed to.
  const version = useAnnotationStore((s) => s.annotationMarksVersion);
  const marksApi = useAnnotationStoreApi();
  const rangeApi = useRangeStoreApi();
  // Optimistic: the mark leaves at once, and comes back if the delete fails.
  const [remove] = useDeleteExperimentAnnotationMutation();

  const items = useMemo(() => {
    const out: Item[] = [];
    const shapes = new Set<string>();
    for (const marks of Object.values(marksApi.getState().annotationMarks)) {
      for (const e of marks.events) {
        out.push({
          key: `e:${e.id}`,
          annotationId: e.annotationId,
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
      // A shape drawn over a lens two traces read appears in both rows: list it once.
      for (const row of marks.rows) {
        for (const shape of row.shapes) {
          if (shapes.has(shape.id)) continue;
          shapes.add(shape.id);
          out.push({
            key: `s:${shape.id}`,
            annotationId: shape.id,
            kind: shape.kind,
            name: shape.name,
            start: Math.min(...shape.times),
            end: Math.max(...shape.times),
            color: shape.color,
          });
        }
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
        Nothing marked yet. Switch the viewer to annotate (hold A, or the pen in its
        controls) and pick a tool: events and epochs span every row, lines, paths
        and polygons are drawn over a trace.
      </div>
    );
  }

  const onDelete = (annotationId: string) =>
    void remove({
      variables: { id: annotationId },
      optimisticResponse: { __typename: "Mutation", deleteAnnotation: annotationId },
      update: (cache) => evictAnnotation(cache, annotationId),
    }).catch((error: unknown) =>
      toast.error(`Could not delete: ${error instanceof Error ? error.message : String(error)}`),
    );

  return (
    <div className="flex flex-col gap-1 overflow-y-auto p-3">
      {items.map((item) => (
        <AnnotationRow
          key={item.key}
          item={item}
          onOpen={(additive) => {
            marksApi.getState().selectAnnotation(item.annotationId, additive);
            jump(item.start, item.end);
          }}
          onDelete={() => onDelete(item.annotationId)}
        />
      ))}
    </div>
  );
};

const AnnotationRow = ({
  item,
  onOpen,
  onDelete,
}: {
  item: Item;
  onOpen: (additive: boolean) => void;
  onDelete: () => void;
}) => {
  // One boolean per row: a selection change re-renders only the rows it flips.
  const selected = useIsAnnotationSelected(item.annotationId);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);
  const Icon = ICONS[item.kind];
  const instant = item.end === item.start;

  return (
    <div
      ref={ref}
      aria-selected={selected}
      className={
        "group flex items-center gap-2 rounded-md px-1.5 py-1 " +
        (selected ? "bg-accent ring-1 ring-primary/50" : "hover:bg-accent/40")
      }
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        onClick={(event) => onOpen(event.shiftKey)}
      >
        <Icon className="h-3 w-3 shrink-0" style={{ color: item.color ?? "#fbbf24" }} />
        <span className="truncate text-xs">{item.name || FALLBACK_NAMES[item.kind]}</span>
        <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground">
          {instant ? formatValue(item.start) : `${formatValue(item.start)}–${formatValue(item.end)}`}
        </span>
      </button>
      <Button
        size="icon-xs"
        variant="ghost"
        className="opacity-0 group-hover:opacity-100"
        title="Delete this mark"
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
    </div>
  );
};
