import { useCallback, useEffect, useId, useRef, useState } from "react";
import { DragPoint } from "./engine";
import { useDragSource, useDropTarget } from "./react";

/**
 * Reordering by drag, two ways.
 *
 * The plain way (`useSortableItem`): the rows stay where they are and a line
 * shows where the dragged one would go. Nothing is measured or animated while
 * the pointer moves.
 *
 * The parting way (`useSortableList` / `useSortableRow`): the list re-renders
 * in the order it would have, as the pointer moves, so the rows part around a
 * gap. The hooks only decide the order; give the rows framer's `layout` and
 * they slide.
 */

export type SortableAxis = "vertical" | "horizontal";
export type SortableEdge = "before" | "after";

type Rect = { top: number; left: number; width: number; height: number };

/** Which half of `rect` the pointer is in. */
export const closestEdge = (
  rect: Rect,
  point: DragPoint,
  axis: SortableAxis,
): SortableEdge =>
  axis === "vertical"
    ? point.clientY < rect.top + rect.height / 2
      ? "before"
      : "after"
    : point.clientX < rect.left + rect.width / 2
      ? "before"
      : "after";

/**
 * Where the item at `from` ends up when dropped on that edge of the item at
 * `over` — its index in the list once it has moved, as `arrayMove` and
 * react-hook-form's `move` take it.
 */
export const reorderedIndex = (from: number, over: number, edge: SortableEdge) => {
  const slot = edge === "before" ? over : over + 1;
  return from < slot ? slot - 1 : slot;
};

type SortableDragData = { list: string; index: number };

const SORTABLE_KIND = "sortable";

/** One id per list, so a row can only be dropped among its own. */
export const useSortableListId = () => useId();

/**
 * A row of a sortable list: drag it, or drop another row of the same list on
 * it. `edge` is where the line goes — `null` when nothing is over the row, or
 * when dropping there would leave the order as it is.
 */
export const useSortableItem = ({
  list,
  index,
  axis = "vertical",
  onReorder,
}: {
  list: string;
  index: number;
  axis?: SortableAxis;
  onReorder: (from: number, to: number) => void;
}) => {
  const nodeRef = useRef<HTMLElement | null>(null);
  const [hover, setHover] = useState<{ from: number; edge: SortableEdge } | null>(null);

  const drag = useDragSource({
    kind: SORTABLE_KIND,
    getData: (): SortableDragData => ({ list, index }),
  });

  const edgeAt = (point: DragPoint) =>
    nodeRef.current
      ? closestEdge(nodeRef.current.getBoundingClientRect(), point, axis)
      : "before";

  const { ref: drop, isOver } = useDropTarget({
    accepts: (session) =>
      session.origin === "internal" &&
      session.kind === SORTABLE_KIND &&
      (session.data as SortableDragData).list === list,
    onMove: (point, session) => {
      if (session.origin !== "internal") return;
      const from = (session.data as SortableDragData).index;
      const edge = edgeAt(point);
      setHover((previous) =>
        previous?.from === from && previous.edge === edge ? previous : { from, edge },
      );
    },
    onDrop: (payload, point) => {
      if (payload.origin !== "internal") return;
      const from = (payload.data as SortableDragData).index;
      const to = reorderedIndex(from, index, edgeAt(point));
      if (to !== from) {
        onReorder(from, to);
      }
    },
  });

  const ref = useCallback(
    (node: HTMLElement | null) => {
      nodeRef.current = node;
      drag(node);
      drop(node);
    },
    [drag, drop],
  );

  const edge =
    isOver && hover && reorderedIndex(hover.from, index, hover.edge) !== hover.from
      ? hover.edge
      : null;

  return { ref, edge };
};

/* ------------------------------------------------------------------------ */
/* The parting way                                                           */
/* ------------------------------------------------------------------------ */

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
export const useSortableRow = (list: SortableList, id: string) => {
  const drag = useDragSource({
    kind: SORTABLE_KIND,
    getData: (): SortableRowDragData => ({ list: list.id, id }),
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
