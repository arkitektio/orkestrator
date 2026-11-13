// @vitest-environment jsdom
// (the generated rekuest API module reads `window` on import)
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskEventChangeFragment, TaskEventKind } from "../api/graphql";
import {
  deliverHeldEvents,
  deliverToCallback,
  holdForCallback,
  isTaskLive,
  isTerminalEvent,
  mapReference,
  referenceForId,
  registeredCallbacks,
  taskEventChangeToEvent,
  trackedTasks,
  trackTask,
} from "./taskTracker";

let seq = 0;
const change = (task: string, kind: TaskEventKind): TaskEventChangeFragment => ({
  __typename: "TaskEventChange",
  id: `e${++seq}`,
  task,
  kind,
  message: null,
  progress: null,
  returns: null,
  createdAt: "2026-09-17T00:00:00Z",
});

beforeEach(() => {
  registeredCallbacks.clear();
});

describe("LOST", () => {
  it("ends a task: its agent died and nothing re-runs it", () => {
    expect(isTerminalEvent(TaskEventKind.Lost)).toBe(true);
    expect(
      isTaskLive({ isDone: false, latestEventKind: TaskEventKind.Lost }),
    ).toBe(false);
  });

  it("but a late report after it is only an annotation", () => {
    expect(isTerminalEvent(TaskEventKind.LateReport)).toBe(false);
  });

  it("ends the local tracking like any other terminal event", () => {
    const callback = vi.fn();
    trackTask("ref-lost", callback);
    deliverToCallback(
      "ref-lost",
      taskEventChangeToEvent(change("l", TaskEventKind.Lost), "ref-lost"),
    );
    expect(callback).toHaveBeenCalledOnce();
    expect(registeredCallbacks.has("ref-lost")).toBe(false);
  });
});

describe("delivering task events to a local tracker", () => {
  it("ends the tracking on the terminal event", () => {
    const callback = vi.fn();
    trackTask("ref-a", callback);
    mapReference("a", "ref-a");

    deliverToCallback("ref-a", taskEventChangeToEvent(change("a", TaskEventKind.Progress), "ref-a"));
    expect(registeredCallbacks.has("ref-a")).toBe(true);

    deliverToCallback("ref-a", taskEventChangeToEvent(change("a", TaskEventKind.Completed), "ref-a"));
    expect(callback).toHaveBeenCalledTimes(2);
    expect(registeredCallbacks.has("ref-a")).toBe(false);
    expect(referenceForId("a")).toBeUndefined();
  });

  // An id-only event cannot be routed until the task's reference is known. A
  // task that finished before that used to leave its tracker waiting forever.
  it("hands over events that arrived before the task's reference was known", () => {
    const callback = vi.fn();
    trackTask("ref-b", callback);

    holdForCallback("b", change("b", TaskEventKind.Started));
    holdForCallback("b", change("b", TaskEventKind.Completed));
    deliverHeldEvents("b");
    expect(callback).not.toHaveBeenCalled();

    mapReference("b", "ref-b");
    deliverHeldEvents("b");

    expect(callback.mock.calls.map(([event]) => event.kind)).toEqual([
      TaskEventKind.Started,
      TaskEventKind.Completed,
    ]);
    expect(callback.mock.calls[0][0].task.reference).toBe("ref-b");
    expect(registeredCallbacks.has("ref-b")).toBe(false);
  });

  it("delivers held events once, whichever channel names the reference first", () => {
    const callback = vi.fn();
    trackTask("ref-c", callback);
    holdForCallback("c", change("c", TaskEventKind.Progress));

    mapReference("c", "ref-c");
    deliverHeldEvents("c"); // the subscription's `create`
    deliverHeldEvents("c"); // the assign response

    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe("an event that comes twice", () => {
  it("reaches a tracker once: off the subscription, or off the task's history", () => {
    const seen: string[] = [];
    trackTask("ref-twice", (event) => seen.push(event.id));
    const started = taskEventChangeToEvent(change("t-twice", TaskEventKind.Started), "ref-twice");
    const done = taskEventChangeToEvent(change("t-twice", TaskEventKind.Completed), "ref-twice");

    deliverToCallback("ref-twice", started);
    deliverToCallback("ref-twice", started);
    deliverToCallback("ref-twice", done);
    deliverToCallback("ref-twice", done);

    expect(seen).toEqual([started.id, done.id]);
    expect(registeredCallbacks.has("ref-twice")).toBe(false);
  });

  it("is told again to a tracker that registers anew for the reference", () => {
    const first: string[] = [];
    const stop = trackTask("ref-anew", (event) => first.push(event.id));
    const started = taskEventChangeToEvent(change("t-anew", TaskEventKind.Started), "ref-anew");
    deliverToCallback("ref-anew", started);
    stop();

    const second: string[] = [];
    trackTask("ref-anew", (event) => second.push(event.id));
    deliverToCallback("ref-anew", started);

    expect([first, second]).toEqual([[started.id], [started.id]]);
  });
});

describe("trackedTasks", () => {
  it("lists the tasks a component still tracks and whose id is known", () => {
    trackTask("ref-known", () => {});
    trackTask("ref-unknown", () => {});
    mapReference("t-known", "ref-known");
    mapReference("t-untracked", "ref-nobody");

    expect(trackedTasks()).toContainEqual({ id: "t-known", reference: "ref-known" });
    expect(trackedTasks().map((task) => task.reference)).not.toContain("ref-nobody");
    expect(trackedTasks().map((task) => task.reference)).not.toContain("ref-unknown");
  });
});
