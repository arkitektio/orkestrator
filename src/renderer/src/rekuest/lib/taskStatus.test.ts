import { describe, expect, it, vi } from "vitest";

// Only the TaskEventKind enum is needed; the generated module drags in the
// Apollo client and `window`.
vi.mock("../api/graphql", () => ({
  TaskEventKind: {
    Queued: "QUEUED",
    Started: "STARTED",
    Progress: "PROGRESS",
    Completed: "COMPLETED",
    Cancelling: "CANCELLING",
    Cancelled: "CANCELLED",
    Interrupting: "INTERRUPTING",
    Interrupted: "INTERRUPTED",
    Failed: "FAILED",
    Critical: "CRITICAL",
    Lost: "LOST",
    Pausing: "PAUSING",
    Paused: "PAUSED",
  },
}));

import { TaskEventKind } from "../api/graphql";
import { isPausable, isResumable, statusBucket } from "./taskStatus";

describe("statusBucket", () => {
  it("lets the kind decide before the done flag", () => {
    // The server sets isDone on every terminal kind.
    expect(statusBucket(TaskEventKind.Failed, true)).toBe("error");
    expect(statusBucket(TaskEventKind.Cancelled, true)).toBe("cancelled");
    expect(statusBucket(TaskEventKind.Completed, true)).toBe("done");
  });

  it("files a lost task as lost, not failed and not done", () => {
    expect(statusBucket(TaskEventKind.Lost, true)).toBe("lost");
  });

  it("files a held task as paused while it waits", () => {
    expect(statusBucket(TaskEventKind.Paused, false)).toBe("paused");
    expect(statusBucket(TaskEventKind.Progress, false)).toBe("running");
    expect(statusBucket(TaskEventKind.Queued, false)).toBe("queued");
  });
});

describe("pause / resume", () => {
  const t = (latestEventKind: TaskEventKind, isDone = false) => ({
    latestEventKind,
    isDone,
  });

  it("offers resume only for a paused task", () => {
    expect(isResumable(t(TaskEventKind.Paused))).toBe(true);
    expect(isResumable(t(TaskEventKind.Progress))).toBe(false);
  });

  it("offers pause only while it runs", () => {
    expect(isPausable(t(TaskEventKind.Progress))).toBe(true);
    expect(isPausable(t(TaskEventKind.Pausing))).toBe(false);
    expect(isPausable(t(TaskEventKind.Paused))).toBe(false);
    expect(isPausable(t(TaskEventKind.Queued))).toBe(false);
    expect(isPausable(t(TaskEventKind.Lost, true))).toBe(false);
  });
});
