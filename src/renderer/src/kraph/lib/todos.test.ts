import { describe, expect, it } from "vitest";
import { TodoStatus } from "../api/graphql";
import { columnOf, dropIndex, dueState, formatDue, moveCard, settleItem, todoTitleFor } from "./todos";

const card = (id: string, status: TodoStatus, position: number) => ({ id, status, position });

const board = [
  card("a", TodoStatus.Todo, 0),
  card("b", TodoStatus.Todo, 1),
  card("c", TodoStatus.Todo, 2),
  card("d", TodoStatus.Doing, 0),
];

const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe("moveCard", () => {
  it("puts a card at an index of another column and renumbers that column", () => {
    const moved = moveCard(board, "b", TodoStatus.Doing, 0);
    expect(ids(columnOf(moved, TodoStatus.Doing))).toEqual(["b", "d"]);
    expect(columnOf(moved, TodoStatus.Doing).map((item) => item.position)).toEqual([0, 1]);
    expect(ids(columnOf(moved, TodoStatus.Todo))).toEqual(["a", "c"]);
  });

  it("reorders within a column", () => {
    const moved = moveCard(board, "c", TodoStatus.Todo, 0);
    expect(ids(columnOf(moved, TodoStatus.Todo))).toEqual(["c", "a", "b"]);
  });

  it("puts a card past the end last", () => {
    const moved = moveCard(board, "a", TodoStatus.Doing, 99);
    expect(ids(columnOf(moved, TodoStatus.Doing))).toEqual(["d", "a"]);
  });

  it("leaves the board alone for an unknown card", () => {
    expect(moveCard(board, "zz", TodoStatus.Done, 0)).toEqual(board);
  });
});

describe("dropIndex", () => {
  const boxes = [
    { top: 0, height: 40 },
    { top: 50, height: 40 },
  ];
  it("counts the cards whose middle is above the pointer", () => {
    expect(dropIndex(boxes, 5)).toBe(0);
    expect(dropIndex(boxes, 30)).toBe(1);
    expect(dropIndex(boxes, 200)).toBe(2);
  });
});

describe("todoTitleFor", () => {
  it("is the object's name for one object", () => {
    expect(todoTitleFor(["cells.tif"])).toBe("cells.tif");
  });

  it("joins a few names and counts the rest", () => {
    expect(todoTitleFor(["a", "b", "c"])).toBe("a, b, c");
    expect(todoTitleFor(["a", "b", "c", "d", "e"])).toBe("a, b and 3 more");
  });

  it("has nothing to say without objects", () => {
    expect(todoTitleFor([])).toBeUndefined();
  });
});


describe("settleItem", () => {
  const item = (status: TodoStatus, done: number, total: number) => ({ status, progress: { done, total } });

  it("finishes the item when its last object is done", () => {
    expect(settleItem(item(TodoStatus.Doing, 2, 3), TodoStatus.Doing, TodoStatus.Done)).toEqual(item(TodoStatus.Done, 3, 3));
  });

  it("takes a Done item back to Doing when one object is reopened", () => {
    expect(settleItem(item(TodoStatus.Done, 3, 3), TodoStatus.Done, TodoStatus.Todo)).toEqual(item(TodoStatus.Doing, 2, 3));
  });

  it("moves a To do item to Doing when an object is started", () => {
    expect(settleItem(item(TodoStatus.Todo, 0, 3), TodoStatus.Todo, TodoStatus.Doing)).toEqual(item(TodoStatus.Doing, 0, 3));
  });

  it("leaves the column alone otherwise", () => {
    expect(settleItem(item(TodoStatus.Todo, 0, 3), TodoStatus.Todo, TodoStatus.Done)).toEqual(item(TodoStatus.Todo, 1, 3));
    expect(settleItem(item(TodoStatus.Doing, 1, 3), TodoStatus.Done, TodoStatus.Todo)).toEqual(item(TodoStatus.Doing, 0, 3));
  });
});


describe("due dates", () => {
  const now = Date.parse("2026-11-05T12:00:00Z");

  it("is overdue once past and not done, never when done", () => {
    expect(dueState("2026-11-04T12:00:00Z", TodoStatus.Doing, now)).toBe("overdue");
    expect(dueState("2026-11-04T12:00:00Z", TodoStatus.Done, now)).toBeNull();
  });

  it("is soon within a day, later after, and nothing without a date", () => {
    expect(dueState("2026-11-05T20:00:00Z", TodoStatus.Todo, now)).toBe("soon");
    expect(dueState("2026-11-09T12:00:00Z", TodoStatus.Todo, now)).toBe("later");
    expect(dueState(null, TodoStatus.Todo, now)).toBeNull();
  });

  it("says how far off in days, hours or minutes", () => {
    expect(formatDue("2026-11-08T12:00:00Z", now)).toBe("due in 3 d");
    expect(formatDue("2026-11-05T17:00:00Z", now)).toBe("due in 5 h");
    expect(formatDue("2026-11-03T12:00:00Z", now)).toBe("overdue 2 d");
    expect(formatDue("2026-11-05T11:20:00Z", now)).toBe("overdue 40 min");
  });
});
