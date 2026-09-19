import {
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";
import {
  useSortableList,
  useSortableRow,
  type SortableAxis,
  type SortableList as SortableListHandle,
} from "./sortable";

/**
 * The parting sortable list as a headless component: `useSortableList` +
 * `useSortableRow`, wired, with no markup or style of its own beyond the one
 * container element it must render (`as`, a `div` by default).
 *
 *     <SortableList
 *       items={tabs}
 *       getId={(tab) => tab.id}
 *       onReorder={move}
 *       groupOf={(tab) => (tab.pinned ? "pinned" : "open")}
 *       className="flex flex-col gap-0.5"
 *     >
 *       {(tab, row) => <motion.div ref={row.ref} layout="position">…</motion.div>}
 *     </SortableList>
 *
 * The container is the drop target and must hold the rows and nothing else —
 * their places are measured from it. Each row is rendered by `children` in the
 * order to show NOW (mid-drag, the one it would become), and must put
 * `row.ref` on its outermost element: that is what is dragged, and what the
 * engine marks `data-dragging` (style the gap with `dragging:`). The slide is
 * the caller's — give the row framer's `layout` and the rows part around the
 * gap. Keys are handled here, by id.
 *
 * `onReorder(id, to)`: `to` is the row's index once moved, as `arrayMove` has
 * it. `groupOf` keeps a row within its group, the groups lying together.
 */

export type SortableRowProps = {
  /** For the row's outermost element: what is dragged, and what is measured. */
  ref: (node: HTMLElement | null) => void;
  id: string;
  /** Its place in the REAL order — not in the one shown mid-drag. */
  index: number;
  /** Its place in the order shown now. */
  position: number;
};

type OwnProps<T> = {
  items: readonly T[];
  getId: (item: T) => string;
  onReorder: (id: string, to: number) => void;
  groupOf?: (item: T) => string;
  axis?: SortableAxis;
  children: (item: T, row: SortableRowProps) => ReactNode;
};

export type SortableListProps<T, E extends ElementType = "div"> = OwnProps<T> & {
  /** The container element; its props pass through. */
  as?: E;
} & Omit<ComponentPropsWithoutRef<E>, keyof OwnProps<T> | "as">;

export const SortableList = <T, E extends ElementType = "div">({
  items,
  getId,
  onReorder,
  groupOf,
  axis,
  as,
  children,
  ...rest
}: SortableListProps<T, E>) => {
  // Typed as a div for rendering: `rest` was checked against `E` at the call site.
  const Container = (as ?? "div") as "div";
  const ids = items.map(getId);
  const byId = new Map(items.map((item, index) => [ids[index], { item, index }]));

  const list = useSortableList({
    ids,
    onReorder,
    axis,
    groupOf: groupOf
      ? (id) => {
          const entry = byId.get(id);
          return entry ? groupOf(entry.item) : "";
        }
      : undefined,
  });

  return (
    <Container {...(rest as ComponentPropsWithoutRef<"div">)} ref={list.ref}>
      {list.order.map((id, position) => {
        const entry = byId.get(id);
        return entry ? (
          <SortableRowSlot key={id} list={list} id={id} index={entry.index} position={position}>
            {(row) => children(entry.item, row)}
          </SortableRowSlot>
        ) : null;
      })}
    </Container>
  );
};

/** One row's hook, so each row holds its own drag source. */
const SortableRowSlot = ({
  list,
  id,
  index,
  position,
  children,
}: {
  list: SortableListHandle;
  id: string;
  index: number;
  position: number;
  children: (row: SortableRowProps) => ReactNode;
}) => {
  const { ref } = useSortableRow(list, id);
  return <>{children({ ref, id, index, position })}</>;
};
