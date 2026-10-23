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

// The server writes HELD (with `held`, the child's id) on the root the pill
// tracks, and DECIDED with the same `held` once the user answered.
describe("a pill whose replyer waits for the user", () => {
  const heldValue = {
    kind: "assign",
    held: "c7",
    prompt: { title: "Delegate to Segmenter", description: "It counts nuclei." },
    action: { id: "a1", name: "Segmenter", hash: "h1" },
    agent: { id: "ag2", name: "segmenter-app" },
    caller_agent: { id: "ag1", name: "blok-assistant" },
    args: { sigma: 2 },
  };
  const held = () =>
    applyTaskEvent(
      applyTaskEvent(started(), event(TaskEventKind.Progress, { message: "Round 2..." })),
      event(TaskEventKind.Held, { id: "e-held", value: heldValue, message: "Delegate to Segmenter" }),
    );

  it("is HELD with what waits, and keeps its own message", () => {
    const [pill] = held();
    expect(pill.status).toBe("HELD");
    expect(pill.message).toBe("Round 2...");
    expect(pill.holds).toEqual([
      {
        task: "c7",
        kind: "assign",
        title: "Delegate to Segmenter",
        description: "It counts nuclei.",
        action: { id: "a1", name: "Segmenter", hash: "h1" },
        agent: { id: "ag2", name: "segmenter-app" },
        callerAgent: { id: "ag1", name: "blok-assistant" },
        args: { sigma: 2 },
      },
    ]);
  });

  it("stays HELD through a log, and runs again once decided", () => {
    const logged = applyTaskEvent(held(), event(TaskEventKind.Log, { id: "e-log", message: "still here" }));
    expect(statusOf(logged)).toBe("HELD");

    const decided = applyTaskEvent(
      logged,
      event(TaskEventKind.Decided, { id: "e-dec", value: { held: "c7", approved: true, answer: null, auto: false } }),
    );
    expect(statusOf(decided)).toBe("RUNNING");
    expect(decided[0].holds).toEqual([]);
  });

  it("keeps what was decided, with the hold it answered, for the conversation to show", () => {
    const declined = applyTaskEvent(
      held(),
      event(TaskEventKind.Decided, {
        id: "e-dec",
        value: { held: "c7", approved: false, answer: "not that plate", auto: false },
      }),
    );
    expect(declined[0].decided).toEqual([
      expect.objectContaining({
        task: "c7",
        approved: false,
        auto: false,
        answer: "not that plate",
        hold: expect.objectContaining({ title: "Delegate to Segmenter" }),
      }),
    ]);
  });

  it("recalls nothing for a decision about a hold it never showed", () => {
    const [pill] = applyTaskEvent(
      started(),
      event(TaskEventKind.Decided, { id: "e-dec", value: { held: "c9", approved: true, auto: true } }),
    );
    expect(pill.decided).toBeUndefined();
  });

  it("holds itself without `held`, and a DENIED kind settles as cancelled", () => {
    const self = applyTaskEvent(
      started(),
      event(TaskEventKind.Held, { value: { kind: "self", prompt: { title: "Overwrite?" } } }),
    );
    expect(statusOf(self)).toBe("HELD");
    expect(self[0].holds?.[0]).toMatchObject({ task: "t1", kind: "self", title: "Overwrite?" });

    expect(statusForKind(TaskEventKind.Denied)).toBe("CANCELLED");
    expect(statusOf(applyTaskEvent(self, event(TaskEventKind.Completed)))).toBe("DONE");
  });

  it("goes back to HELD, not RUNNING, when the assign result arrives late", () => {
    expect(statusOf(bindTask(held(), "ref", { id: "t1", isDone: false, latestEventKind: TaskEventKind.Progress }))).toBe(
      "HELD",
    );
  });
});

describe("bloks a replyer shows", () => {
  it("keeps each inform once, and its message is not the pill's", () => {
    const inform = event(TaskEventKind.Inform, { message: "Halfway", value: { blok: "m4" } } as Partial<TaskEventFragment>);
    let tasks = applyTaskEvent(
      bindTask(started(), "ref", { id: "t1", isDone: false, latestEventKind: TaskEventKind.Started }),
      inform,
    );
    tasks = applyTaskEvent(tasks, inform);
    expect(tasks[0].informs).toEqual([{ task: "t1", blok: "m4", message: "Halfway" }]);
    expect(tasks[0].message).not.toBe("Halfway");
    expect(statusOf(tasks)).toBe("RUNNING");
  });
});
