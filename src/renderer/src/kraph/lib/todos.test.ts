import { describe, expect, it } from "vitest";
import { TodoStatus } from "../api/graphql";
import { columnOf, dropIndex, moveCard, todoTitleFor } from "./todos";

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
