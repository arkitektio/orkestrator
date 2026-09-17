// @vitest-environment jsdom
// (the generated rekuest API module reads `window` on import)
import { describe, expect, it } from "vitest";
import { LogLevel, TaskEventFragment, TaskEventKind } from "@/rekuest/api/graphql";
import {
  ActiveTask,
  applyTaskEvent,
  bindTask,
  failTask,
  settleFromTasks,
  startTask,
  statusForKind,
} from "./activeTasks";

const event = (
  kind: TaskEventKind,
  extra: Partial<TaskEventFragment> = {},
): TaskEventFragment => ({
  __typename: "TaskEvent",
  id: `e-${kind}`,
  kind,
  level: LogLevel.Info,
  returns: null,
  progress: null,
  reference: "ref",
  createdAt: "2026-09-17T00:00:00Z",
  message: null,
  task: { __typename: "Task", id: "t1", reference: "ref" },
  delegatedTo: null,
  ...extra,
});

const started = (): ActiveTask[] => startTask([], "ref", "Replyer");
const statusOf = (tasks: ActiveTask[]) => tasks[0].status;

// A pill is settled by one terminal event and the callback delivering it is torn
// down right after — so every way of losing or overwriting that one update is a
// spinner that never leaves.
describe("the replyer pill", () => {
  it("settles on every terminal kind, not a hand-picked few", () => {
    expect(statusForKind(TaskEventKind.Completed)).toBe("DONE");
    expect(statusForKind(TaskEventKind.Cancelled)).toBe("CANCELLED");
    expect(statusForKind(TaskEventKind.Interrupted)).toBe("CANCELLED");
    expect(statusForKind(TaskEventKind.Failed)).toBe("ERROR");
    expect(statusForKind(TaskEventKind.Critical)).toBe("ERROR");
    expect(statusForKind(TaskEventKind.Progress)).toBe("RUNNING");
    expect(statusForKind(TaskEventKind.Cancelling)).toBe("RUNNING");
  });

  it("follows progress, then settles", () => {
    let tasks = applyTaskEvent(
      started(),
      event(TaskEventKind.Progress, { progress: 40, message: "thinking" }),
    );
    expect(tasks[0]).toMatchObject({ status: "RUNNING", progress: 40, message: "thinking" });

    tasks = applyTaskEvent(tasks, event(TaskEventKind.Completed));
    expect(tasks[0]).toMatchObject({ status: "DONE", progress: 40, message: "thinking" });
  });

  it("stays done when the assign response lands after the terminal event", () => {
    const done = applyTaskEvent(started(), event(TaskEventKind.Completed));
    const bound = bindTask(done, "ref", {
      id: "t1",
      isDone: false,
      latestEventKind: TaskEventKind.Queued,
    });
    expect(statusOf(bound)).toBe("DONE");
  });

  it("is not revived by a straggling event", () => {
    const done = applyTaskEvent(started(), event(TaskEventKind.Failed, { message: "boom" }));
    const after = applyTaskEvent(done, event(TaskEventKind.Log, { message: "late" }));
    expect(after[0]).toMatchObject({ status: "ERROR", message: "boom" });
  });

  it("gets its id from the assign response and starts running", () => {
    const bound = bindTask(started(), "ref", {
      id: "t1",
      isDone: false,
      latestEventKind: TaskEventKind.Queued,
    });
    expect(bound[0]).toMatchObject({ id: "t1", status: "RUNNING" });
  });

  it("settles straight from an assign response that is already finished", () => {
    const bound = bindTask(started(), "ref", {
      id: "t1",
      isDone: true,
      latestEventKind: TaskEventKind.Completed,
    });
    expect(bound[0]).toMatchObject({ id: "t1", status: "DONE" });
  });

  it("fails when the assign itself fails", () => {
    expect(failTask(started(), "ref", "nope")[0]).toMatchObject({
      status: "ERROR",
      message: "nope",
    });
  });

  it("ignores events of other tasks", () => {
    const tasks = started();
    const other = event(TaskEventKind.Completed, {
      task: { __typename: "Task", id: "t2", reference: "other" },
    });
    expect(applyTaskEvent(tasks, other)).toEqual(tasks);
  });
});

describe("settling a pill from the task itself", () => {
  const running = () =>
    bindTask(started(), "ref", { id: "t1", isDone: false, latestEventKind: TaskEventKind.Queued });

  it("settles a pill whose task has ended, however it ended", () => {
    const ended = (latestEventKind: TaskEventKind, isDone = false) =>
      statusOf(settleFromTasks(running(), [{ id: "t1", isDone, latestEventKind }]));

    expect(ended(TaskEventKind.Completed, true)).toBe("DONE");
    expect(ended(TaskEventKind.Failed)).toBe("ERROR");
    expect(ended(TaskEventKind.Cancelled)).toBe("CANCELLED");
    // Flagged done with no terminal kind on record is simply done.
    expect(ended(TaskEventKind.Yield, true)).toBe("DONE");
  });

  it("leaves a live task, an unknown task and an unbound pill alone — same array", () => {
    const tasks = running();
    expect(
      settleFromTasks(tasks, [{ id: "t1", isDone: false, latestEventKind: TaskEventKind.Progress }]),
    ).toBe(tasks);
    expect(
      settleFromTasks(tasks, [{ id: "t9", isDone: true, latestEventKind: TaskEventKind.Completed }]),
    ).toBe(tasks);

    const unbound = started();
    expect(
      settleFromTasks(unbound, [{ id: "", isDone: true, latestEventKind: TaskEventKind.Completed }]),
    ).toBe(unbound);
  });
});
