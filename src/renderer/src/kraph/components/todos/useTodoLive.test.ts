import { TodoChangeKind, TodoStatus, type TodoChangedSubscription, type TodoItemProgressFragment } from "@/kraph/api/graphql";
import { describe, expect, it } from "vitest";
import { TODO_LISTINGS, planTodoChange } from "./useTodoLive";

type Change = NonNullable<TodoChangedSubscription["todoChanged"]>;

const before = (status: TodoStatus, done: number, total: number, list = "l1"): TodoItemProgressFragment => ({
  id: "i1",
  status,
  list: { id: list },
  progress: { done, total },
});

const changed = (status: TodoStatus, done: number, total: number, list = "l1"): Change =>
  ({
    kind: TodoChangeKind.Changed,
    listId: list,
    itemId: "i1",
    item: { id: "i1", status, progress: { done, total } },
  }) as unknown as Change;

describe("planTodoChange", () => {
  it("reads the listings again for an item the cache has not seen", () => {
    expect(planTodoChange(changed(TodoStatus.Todo, 0, 3), null)).toEqual({ refetch: TODO_LISTINGS, doneDelta: 0 });
  });

  it("reads the listings again for an item that came over from another list", () => {
    expect(planTodoChange(changed(TodoStatus.Todo, 0, 3, "l2"), before(TodoStatus.Todo, 0, 3, "l1")).refetch).toEqual(TODO_LISTINGS);
  });

  it("asks nothing more when a known item only changed its words", () => {
    expect(planTodoChange(changed(TodoStatus.Doing, 1, 3), before(TodoStatus.Doing, 1, 3))).toEqual({ refetch: [], doneDelta: 0 });
  });

  it("recounts, and moves the list's Done count, when a known card moves into Done", () => {
    expect(planTodoChange(changed(TodoStatus.Done, 3, 3), before(TodoStatus.Doing, 2, 3))).toEqual({
      refetch: ["TodoSummary", "TodoItemObjects"],
      doneDelta: 1,
    });
    expect(planTodoChange(changed(TodoStatus.Doing, 2, 3), before(TodoStatus.Done, 3, 3)).doneDelta).toBe(-1);
  });

  it("recounts only the summary when a card moves column by hand", () => {
    expect(planTodoChange(changed(TodoStatus.Doing, 0, 3), before(TodoStatus.Todo, 0, 3))).toEqual({ refetch: ["TodoSummary"], doneDelta: 0 });
  });

  it("reads the listings again after a delete", () => {
    const deleted = { kind: TodoChangeKind.Deleted, listId: "l1", itemId: "i1", item: null } as unknown as Change;
    expect(planTodoChange(deleted, before(TodoStatus.Todo, 0, 1)).refetch).toEqual(TODO_LISTINGS);
  });
});
