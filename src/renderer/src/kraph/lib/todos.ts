import { TodoStatus } from "../api/graphql";

/**
 * The todo board's rules, kept apart from React so they can be tested. They
 * mirror what kraph's `moveTodoItem` does on the server, so the board can show
 * a move before the server has answered.
 */

/** The board's columns, in order. */
export const TODO_COLUMNS: readonly { status: TodoStatus; label: string }[] = [
  { status: TodoStatus.Todo, label: "To do" },
  { status: TodoStatus.Doing, label: "Doing" },
  { status: TodoStatus.Done, label: "Done" },
];

export const todoStatusLabel = (status: TodoStatus) =>
  TODO_COLUMNS.find((column) => column.status === status)?.label ?? status;

type Card = { id: string; status: TodoStatus; position: number };

/** One column's cards, in board order. */
export const columnOf = <T extends Card>(items: readonly T[], status: TodoStatus): T[] =>
  items
    .filter((item) => item.status === status)
    .sort((a, b) => a.position - b.position);

/**
 * The cards once `id` is put at `index` of the `status` column: that column is
 * renumbered from 0 (as the server does), every other card is left as it is.
 */
export const moveCard = <T extends Card>(
  items: readonly T[],
  id: string,
  status: TodoStatus,
  index: number,
): T[] => {
  const moving = items.find((item) => item.id === id);
  if (!moving) return [...items];
  const column = columnOf(items, status).filter((item) => item.id !== id);
  column.splice(Math.max(0, Math.min(index, column.length)), 0, { ...moving, status });
  const placed = new Map(column.map((item, position) => [item.id, { ...item, position }]));
  return items.map((item) => placed.get(item.id) ?? item);
};

/** Where a drop at `pointerY` lands in a column, given its cards' boxes (the dragged card left out). */
export const dropIndex = (boxes: readonly { top: number; height: number }[], pointerY: number): number =>
  boxes.filter((box) => box.top + box.height / 2 < pointerY).length;

/** Ticked out of all objects on an item. */
export const structureProgress = (structures: readonly { done: boolean }[]) => ({
  done: structures.filter((structure) => structure.done).length,
  total: structures.length,
});

/**
 * The title an item gets when none is typed: the names of the objects it is
 * about — one name, a few joined, or the first two and how many more.
 * `undefined` when there is nothing to name it after.
 */
export const todoTitleFor = (names: readonly string[]): string | undefined => {
  if (names.length === 0) return undefined;
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
};
