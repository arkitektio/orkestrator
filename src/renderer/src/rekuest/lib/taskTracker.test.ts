// @vitest-environment jsdom
// (the generated rekuest API module reads `window` on import)
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskEventChangeFragment, TaskEventKind } from "../api/graphql";
import {
  deliverHeldEvents,
  deliverToCallback,
  holdForCallback,
  mapReference,
  referenceForId,
  registeredCallbacks,
  taskEventChangeToEvent,
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
