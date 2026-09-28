import { useCallback, useEffect, useId, useRef, useState } from "react";
import { DragEndInfo, DragPoint } from "./engine";
import { useDragSource, useDropTarget } from "./react";

/**
 * Reordering by drag: a list whose rows part around the one being dragged.
 * The list re-renders in the order it would have as the pointer moves, so the
 * rows make a gap; the hooks only decide the order — give the rows framer's
 * `layout` and they slide. `SortableList.tsx` is the same, as a component.
 */

export type SortableAxis = "vertical" | "horizontal";

const SORTABLE_KIND = "sortable";

/**
 * Where the row at `from` would sit — its index once moved — with the pointer
 * at `pointer`: after every other row whose middle the pointer has passed.
 *
 * `midpoints` are those of the rows as they lay when the drag came in, not as
 * they lie now. The rows slide about under the pointer as the order changes;
 * measured live, a row that has just made way would find the pointer on its
 * other side and come straight back.
 *
 * `span`: the first and last index the row may take (a pinned tab stays among
 * the pinned).
 */
export const prospectiveIndex = (
  midpoints: number[],
  from: number,
  pointer: number,
  span: readonly [number, number] = [0, midpoints.length - 1],
) => {
  let passed = 0;
  midpoints.forEach((midpoint, index) => {
    if (index !== from && midpoint < pointer) passed += 1;
  });
  return Math.max(span[0], Math.min(passed, span[1]));
};

/** `ids` with the one at `from` moved to `to`, `to` being its index once moved. */
export const moved = <T,>(ids: readonly T[], from: number, to: number): T[] => {
  const next = [...ids];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

/** The indices `id` may take: those of its group, which lies together in the list. */
const groupSpan = (
  ids: readonly string[],
  id: string,
  groupOf?: (id: string) => string,
): [number, number] => {
  const others = ids.filter((other) => other !== id);
  if (!groupOf) {
    return [0, others.length];
  }
  const group = groupOf(id);
  const members = others.flatMap((other, index) => (groupOf(other) === group ? [index] : []));
  // Alone in its group, it can only stay where it is.
  return members.length > 0
    ? [members[0], members[members.length - 1] + 1]
    : [ids.indexOf(id), ids.indexOf(id)];
};

type SortableRowDragData = { list: string; id: string };

type SortableSnapshot = { id: string; from: number; midpoints: number[]; span: [number, number] };

export type SortableList = {
  id: string;
  /** For the element that wraps the rows, and nothing but the rows. */
  ref: (node: HTMLElement | null) => void;
  /** The ids in the order to render them now: the real one, or mid-drag the one it would become. */
  order: string[];
  /** The rows' nodes, by id. Filled by `useSortableRow`. */
  rows: Map<string, HTMLElement>;
};

/**
 * A list whose rows part around the one being dragged. The whole list is one
 * drop target; the rows are only what is dragged (`useSortableRow`), so a row
 * is free to be a drop target of some other kind.
 *
 * `onReorder(id, to)`: `to` is the row's index once moved, as `arrayMove` has
 * it. `groupOf` keeps a row within its group, the groups lying together.
 */
export const useSortableList = ({
  ids,
  onReorder,
  groupOf,
  axis = "vertical",
}: {
  ids: readonly string[];
  onReorder: (id: string, to: number) => void;
  groupOf?: (id: string) => string;
  axis?: SortableAxis;
}): SortableList => {
  const list = useId();
  const [rows] = useState(() => new Map<string, HTMLElement>());
  const containerRef = useRef<HTMLElement | null>(null);
  const snapshotRef = useRef<SortableSnapshot | null>(null);
  const [preview, setPreview] = useState<{ id: string; to: number } | null>(null);

  const start = (node: HTMLElement) => {
    const rect = node.getBoundingClientRect();
    return axis === "vertical" ? rect.top : rect.left;
  };
  const middle = (node: HTMLElement) => {
    const rect = node.getBoundingClientRect();
    return axis === "vertical" ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
  };

  /** Where the dragged row would go with the pointer at `point`; `null` if it is not ours to say. */
  const indexAt = (id: string, point: DragPoint) => {
    const container = containerRef.current;
    if (!container) return null;

    if (snapshotRef.current?.id !== id) {
      const from = ids.indexOf(id);
      if (from === -1) return null;
      // Measured from the container, so the list may scroll under the drag.
      const origin = start(container);
      snapshotRef.current = {
        id,
        from,
        midpoints: ids.map((rowId) => {
          const row = rows.get(rowId);
          return row ? middle(row) - origin : Number.POSITIVE_INFINITY;
        }),
        span: groupSpan(ids, id, groupOf),
      };
    }

    const { from, midpoints, span } = snapshotRef.current;
    const pointer = (axis === "vertical" ? point.clientY : point.clientX) - start(container);
    return { from, to: prospectiveIndex(midpoints, from, pointer, span) };
  };

  const { ref: drop, isOver } = useDropTarget({
    accepts: (session) =>
      session.origin === "internal" &&
      session.kind === SORTABLE_KIND &&
      (session.data as SortableRowDragData).list === list,
    onMove: (point, session) => {
      if (session.origin !== "internal") return;
      const { id } = session.data as SortableRowDragData;
      const index = indexAt(id, point);
      if (!index) return;
      setPreview((previous) =>
        previous?.id === id && previous.to === index.to ? previous : { id, to: index.to },
      );
    },
    onDrop: (payload, point) => {
      if (payload.origin !== "internal") return;
      const { id } = payload.data as SortableRowDragData;
      const index = indexAt(id, point);
      if (index && index.to !== index.from) {
        onReorder(id, index.to);
      }
    },
  });

  // The measurements are of one visit: the drag gone (dropped, cancelled, or
  // off elsewhere), the rows are back in their real order and the next visit
  // measures them again.
  useEffect(() => {
    if (!isOver) snapshotRef.current = null;
  }, [isOver]);

  const ref = useCallback(
    (node: HTMLElement | null) => {
      containerRef.current = node;
      drop(node);
    },
    [drop],
  );

  const from = preview ? ids.indexOf(preview.id) : -1;
  const order =
    isOver && preview && from !== -1
      ? moved(ids, from, Math.min(preview.to, ids.length - 1))
      : [...ids];

  return { id: list, ref, order, rows };
};

/** A row of a `useSortableList`: what is dragged. The engine marks it `data-dragging`. */
export const useSortableRow = (
  list: SortableList,
  id: string,
  /** The row's drag ended without a drop in this window (`DragSourceConfig.onEnd`). */
  onDragEnd?: (id: string, info: DragEndInfo) => void,
) => {
  const drag = useDragSource({
    kind: SORTABLE_KIND,
    getData: (): SortableRowDragData => ({ list: list.id, id }),
    onEnd: onDragEnd ? (info) => onDragEnd(id, info) : undefined,
  });

  const { rows } = list;
  const ref = useCallback(
    (node: HTMLElement | null) => {
      drag(node);
      if (node) {
        rows.set(id, node);
      } else {
        rows.delete(id);
      }
    },
    [drag, rows, id],
  );

  return { ref };
};
