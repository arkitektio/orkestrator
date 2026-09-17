import { describe, expect, it, vi } from "vitest";

// Only the TaskEventKind enum is needed; the generated module drags in the
// Apollo client and `window`.
vi.mock("../api/graphql", () => ({
  TaskEventKind: {
    Queued: "QUEUED",
    Started: "STARTED",
    Progress: "PROGRESS",
    Yield: "YIELD",
    Completed: "COMPLETED",
    Cancelling: "CANCELLING",
    Cancelled: "CANCELLED",
    Interrupting: "INTERRUPTING",
    Interrupted: "INTERRUPTED",
    Failed: "FAILED",
    Critical: "CRITICAL",
  },
  LogLevel: { Info: "INFO" },
}));

import { TaskEventKind } from "../api/graphql";
import {
  MAX_VISIBLE_ROWS,
  orderFromSignature,
  overflowDots,
  rankSignature,
  RankableTask,
  reconcileOrder,
  shouldAutoDismiss,
  splitVisible,
  taskRank,
} from "./taskIsland";

const task = (
  latestEventKind: TaskEventKind,
  isDone = false,
): RankableTask => ({ latestEventKind, isDone });

const running = task(TaskEventKind.Progress);
const queued = task(TaskEventKind.Queued);
const failed = task(TaskEventKind.Failed);
const done = task(TaskEventKind.Completed, true);
const cancelled = task(TaskEventKind.Cancelled);

const order = (ids: string[], tasks: Record<string, RankableTask>) =>
  orderFromSignature(rankSignature(ids, new Map(Object.entries(tasks)))).map(
    (entry) => entry.id,
  );

describe("taskRank", () => {
  it("puts working tasks first, failures next, quiet finishes last", () => {
    expect(taskRank(running)).toBe(0);
    expect(taskRank(queued)).toBe(0);
    expect(taskRank(failed)).toBe(1);
    expect(taskRank(task(TaskEventKind.Critical))).toBe(1);
    expect(taskRank(done)).toBe(2);
    expect(taskRank(cancelled)).toBe(2);
  });

  it("treats a task that is not hydrated yet as live", () => {
    // It was only just created; sinking it to the bottom until its first
    // event arrives would hide exactly the task the user just started.
    expect(taskRank(undefined)).toBe(0);
  });

  it("keeps a task that was asked to stop live until it actually stopped", () => {
    // `statusBucket` files these under "cancelled"; ranking on it would drop a
    // still-running task below finished ones.
    expect(taskRank(task(TaskEventKind.Cancelling))).toBe(0);
    expect(taskRank(task(TaskEventKind.Interrupting))).toBe(0);
    expect(taskRank(task(TaskEventKind.Interrupted))).toBe(2);
  });
});

describe("ordering", () => {
  it("sorts by rank", () => {
    expect(
      order(["d", "f", "r"], { d: done, f: failed, r: running }),
    ).toEqual(["r", "f", "d"]);
  });

  it("keeps the store's newest-first order within a rank", () => {
    expect(
      order(["r3", "d1", "r2", "r1"], {
        r3: running,
        d1: done,
        r2: queued,
        r1: running,
      }),
    ).toEqual(["r3", "r2", "r1", "d1"]);
  });

  it("does not change signature on progress, only on a change of rank", () => {
    const ids = ["a", "b"];
    const before = rankSignature(
      ids,
      new Map([
        ["a", task(TaskEventKind.Started)],
        ["b", running],
      ]),
    );
    const progressed = rankSignature(
      ids,
      new Map([
        ["a", task(TaskEventKind.Yield)],
        ["b", running],
      ]),
    );
    const settled = rankSignature(
      ids,
      new Map([
        ["a", done],
        ["b", running],
      ]),
    );
    expect(progressed).toBe(before);
    expect(settled).not.toBe(before);
  });

  it("round-trips ids containing separators and quotes", () => {
    const ids = ['a|b', 'c,"d"', "e]"];
    expect(order(ids, {})).toEqual(ids);
  });
});

describe("reconcileOrder", () => {
  it("keeps the frozen order even when the live order changed", () => {
    expect(reconcileOrder(["a", "b", "c"], ["c", "a", "b"])).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("puts tasks that appeared since on top, and drops dismissed ones", () => {
    expect(reconcileOrder(["a", "b", "c"], ["new", "c", "a"])).toEqual([
      "new",
      "a",
      "c",
    ]);
  });
});

describe("splitVisible", () => {
  const ids = ["a", "b", "c", "d", "e"];

  it("shows everything when it fits", () => {
    expect(splitVisible(["a", "b", "c"])).toEqual({
      visible: ["a", "b", "c"],
      hidden: [],
    });
  });

  it("caps the visible rows and hands back the rest", () => {
    const { visible, hidden } = splitVisible(ids);
    expect(visible).toHaveLength(MAX_VISIBLE_ROWS);
    expect(visible).toEqual(["a", "b", "c"]);
    expect(hidden).toEqual(["d", "e"]);
  });

  it("shows everything when asked to", () => {
    expect(splitVisible(ids, { showAll: true })).toEqual({
      visible: ids,
      hidden: [],
    });
  });

  it("never hides the expanded row", () => {
    // A row the user has open must not vanish behind the peek because a newer
    // task pushed it past the cap.
    expect(splitVisible(ids, { keepId: "e" })).toEqual({
      visible: ["a", "b", "e"],
      hidden: ["c", "d"],
    });
  });

  it("ignores a keepId that is already visible or unknown", () => {
    expect(splitVisible(ids, { keepId: "b" }).visible).toEqual(["a", "b", "c"]);
    expect(splitVisible(ids, { keepId: "zz" }).visible).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("shouldAutoDismiss", () => {
  it("clears a quiet finish", () => {
    expect(shouldAutoDismiss(done, false)).toBe(true);
    expect(shouldAutoDismiss(cancelled, false)).toBe(true);
    // Used to linger forever: the old check only knew COMPLETED / CANCELLED.
    expect(shouldAutoDismiss(task(TaskEventKind.Interrupted), false)).toBe(
      true,
    );
  });

  it("keeps failures, results, and anything still working", () => {
    expect(shouldAutoDismiss(failed, false)).toBe(false);
    expect(shouldAutoDismiss(done, true)).toBe(false);
    expect(shouldAutoDismiss(running, false)).toBe(false);
    expect(shouldAutoDismiss(undefined, false)).toBe(false);
  });
});

describe("overflowDots", () => {
  it("is one dot per hidden task, capped", () => {
    expect(overflowDots([0, 1, 2])).toEqual([0, 1, 2]);
    expect(overflowDots(Array(20).fill(0))).toHaveLength(8);
  });
});
