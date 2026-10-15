import { describe, expect, it } from "vitest";

import { buildTaskIndex, indexTasks, taskIndexStore } from "./taskIndex";

const task = (id: string, action: string, implementation: string | null, createdAt: string) => ({
  id,
  createdAt,
  action: { id: action },
  implementation: implementation ? { id: implementation } : null,
});

describe("buildTaskIndex", () => {
  it("names the newest task of each action and implementation", () => {
    const index = buildTaskIndex([
      task("1", "a", "i1", "2026-10-15T10:00:00Z"),
      task("2", "a", "i2", "2026-10-15T10:05:00Z"),
      task("3", "b", "i1", "2026-10-15T10:01:00Z"),
      // Seeded out of order: still the older one of action a.
      task("4", "a", "i1", "2026-10-15T09:00:00Z"),
    ]);
    expect(index.latestByAction).toEqual({ a: "2", b: "3" });
    expect(index.latestByImplementation).toEqual({ i1: "3", i2: "2" });
  });

  it("lets the later-listed task win a tie (it was appended last)", () => {
    const index = buildTaskIndex([
      task("1", "a", null, "2026-10-15T10:00:00Z"),
      task("2", "a", null, "2026-10-15T10:00:00Z"),
    ]);
    expect(index.latestByAction).toEqual({ a: "2" });
  });
});

describe("indexTasks", () => {
  it("only notifies when a latest id moves", () => {
    let notified = 0;
    const unsubscribe = taskIndexStore.subscribe(() => (notified += 1));
    const tasks = [task("1", "a", "i1", "2026-10-15T10:00:00Z")];
    indexTasks(tasks);
    indexTasks([...tasks]);
    expect(notified).toBe(1);
    indexTasks([...tasks, task("2", "a", "i1", "2026-10-15T10:01:00Z")]);
    expect(notified).toBe(2);
    expect(taskIndexStore.getState().latestByAction.a).toBe("2");
    unsubscribe();
  });
});
