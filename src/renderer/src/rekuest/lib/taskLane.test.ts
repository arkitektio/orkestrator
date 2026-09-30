import { describe, expect, it, vi } from "vitest";

// Only the enums are needed; the generated module drags in the Apollo client
// and `window`.
vi.mock("../api/graphql", () => ({
  TaskEventKind: {
    Queued: "QUEUED",
    Started: "STARTED",
    Progress: "PROGRESS",
    Log: "LOG",
    Yield: "YIELD",
    Completed: "COMPLETED",
    Failed: "FAILED",
    Critical: "CRITICAL",
    Lost: "LOST",
    LateReport: "LATE_REPORT",
    Paused: "PAUSED",
    Cancelled: "CANCELLED",
    Cancelling: "CANCELLING",
    Interrupted: "INTERRUPTED",
    Interrupting: "INTERRUPTING",
  },
  LogLevel: {
    Debug: "DEBUG",
    Info: "INFO",
    Warn: "WARN",
    Error: "ERROR",
    Critical: "CRITICAL",
  },
}));

import { LogLevel, TaskEventKind } from "../api/graphql";
import {
  clusterMarks,
  LaneChild,
  LaneEvent,
  layoutTaskLane,
} from "./taskLane";

const T0 = Date.parse("2026-09-30T10:00:00Z");
const iso = (s: number) => new Date(T0 + s * 1000).toISOString();

const ev = (
  id: string,
  kind: TaskEventKind,
  s: number,
  step: number | null = null,
  level: LogLevel = LogLevel.Info,
  message: string | null = null,
): LaneEvent => ({ id, kind, createdAt: iso(s), step, level, message });

const child = (
  id: string,
  s: number,
  end: number | null,
  parentStep: number | null = null,
): LaneChild => ({
  id,
  createdAt: iso(s),
  finishedAt: end == null ? null : iso(end),
  parentStep,
  latestEventKind: end == null ? TaskEventKind.Started : TaskEventKind.Completed,
  isDone: end != null,
});

const done = (end: number) => ({
  createdAt: iso(0),
  finishedAt: iso(end),
  isDone: true,
  latestEventKind: TaskEventKind.Completed,
});

describe("layoutTaskLane", () => {
  it("scales by time over the task's lifetime", () => {
    const lane = layoutTaskLane(
      done(10),
      [
        ev("q", TaskEventKind.Queued, 0),
        ev("s", TaskEventKind.Started, 1, 1),
        ev("y", TaskEventKind.Yield, 5, 2),
        ev("c", TaskEventKind.Completed, 10, 3),
      ],
      [],
      T0 + 60_000,
    );
    const y = lane.marks.find((m) => m.event.id === "y")!;
    expect(y.track).toBe("yield");
    expect(y.x).toBeCloseTo(0.5);
    expect(lane.attempts).toEqual([{ index: 0, x0: 0, x1: 1 }]);
  });

  it("keeps journal order: a late resend never moves back in x", () => {
    // Step 2 arrives after step 3 (resent from the journal).
    const lane = layoutTaskLane(
      done(10),
      [
        ev("s", TaskEventKind.Started, 1, 1),
        ev("l3", TaskEventKind.Log, 4, 3),
        ev("l2", TaskEventKind.Log, 8, 2),
        ev("c", TaskEventKind.Completed, 10, 4),
      ],
      [],
      T0,
    );
    const order = lane.marks.map((m) => m.event.id);
    expect(order).toEqual(["s", "l2", "l3", "c"]);
    const xs = lane.marks.map((m) => m.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
  });

  it("gives each resume its own attempt band", () => {
    const lane = layoutTaskLane(
      done(20),
      [
        ev("q1", TaskEventKind.Queued, 0),
        ev("s1", TaskEventKind.Started, 1, 1),
        ev("q2", TaskEventKind.Queued, 10),
        ev("s2", TaskEventKind.Started, 11, 2),
        ev("c", TaskEventKind.Completed, 20, 3),
      ],
      [],
      T0,
    );
    expect(lane.attempts).toHaveLength(2);
    expect(lane.attempts[0]).toEqual({ index: 0, x0: 0, x1: 0.5 });
    expect(lane.attempts[1]).toEqual({ index: 1, x0: 0.5, x1: 1 });
    expect(lane.marks.find((m) => m.event.id === "s2")!.attempt).toBe(1);
  });

  it("puts a LATE_REPORT after the LOST, as a warning yield", () => {
    const lane = layoutTaskLane(
      done(10),
      [
        ev("s", TaskEventKind.Started, 1, 1),
        ev("lost", TaskEventKind.Lost, 5),
        ev("late", TaskEventKind.LateReport, 8, 2),
      ],
      [],
      T0,
    );
    const ids = lane.marks.map((m) => m.event.id);
    expect(ids.indexOf("late")).toBeGreaterThan(ids.indexOf("lost"));
    const late = lane.marks.find((m) => m.event.id === "late")!;
    expect(late.track).toBe("yield");
    expect(late.severity).toBe("warn");
  });

  it("flags severity by level and kind, drops silent progress", () => {
    const lane = layoutTaskLane(
      done(10),
      [
        ev("w", TaskEventKind.Log, 1, 1, LogLevel.Warn),
        ev("e", TaskEventKind.Log, 2, 2, LogLevel.Error),
        ev("p", TaskEventKind.Progress, 3, 3),
        ev("pm", TaskEventKind.Progress, 4, 4, LogLevel.Info, "half way"),
        ev("f", TaskEventKind.Failed, 5, 5),
      ],
      [],
      T0,
    );
    const by = Object.fromEntries(lane.marks.map((m) => [m.event.id, m]));
    expect(by.w.severity).toBe("warn");
    expect(by.e.severity).toBe("error");
    expect(by.p).toBeUndefined();
    expect(by.pm.track).toBe("log");
    expect(by.f).toMatchObject({ track: "status", severity: "error" });
  });

  it("packs overlapping child calls into rows and extends a running one to now", () => {
    const lane = layoutTaskLane(
      {
        createdAt: iso(0),
        finishedAt: null,
        isDone: false,
        latestEventKind: TaskEventKind.Started,
      },
      [ev("s", TaskEventKind.Started, 0, 1)],
      [child("a", 1, 5, 2), child("b", 2, 4, 3), child("c", 6, null, 4)],
      T0 + 10_000,
    );
    const by = Object.fromEntries(lane.segments.map((s) => [s.child.id, s]));
    expect(by.a.row).toBe(0);
    expect(by.b.row).toBe(1);
    expect(by.c.row).toBe(0);
    expect(lane.rows).toBe(2);
    expect(by.c.x1).toBe(1);
    expect(by.c.status).toBe("running");
    expect(by.a.status).toBe("done");
  });

  it("ends an ended task at its finish, however long ago, stale children too", () => {
    // Opened a day later; one child never reported its end.
    const lane = layoutTaskLane(
      done(10),
      [ev("s", TaskEventKind.Started, 0, 1), ev("c", TaskEventKind.Completed, 10, 3)],
      [child("stale", 2, null, 2)],
      T0 + 86_400_000,
    );
    expect(lane.end).toBe(T0 + 10_000);
    expect(lane.segments[0].x1).toBe(1);
  });

  it("treats a failed task as ended even before isDone arrives", () => {
    const lane = layoutTaskLane(
      {
        createdAt: iso(0),
        finishedAt: null,
        isDone: false,
        latestEventKind: TaskEventKind.Failed,
      },
      [ev("s", TaskEventKind.Started, 0, 1), ev("f", TaskEventKind.Failed, 5, 2)],
      [],
      T0 + 86_400_000,
    );
    expect(lane.end).toBe(T0 + 5_000);
  });
});

describe("clusterMarks", () => {
  const lane = layoutTaskLane(
    done(100),
    [
      ev("a", TaskEventKind.Log, 10, 1),
      ev("b", TaskEventKind.Log, 11, 2, LogLevel.Error),
      ev("c", TaskEventKind.Log, 50, 3),
    ],
    [],
    T0,
  );

  it("merges near marks at a narrow width, keeping the worst severity", () => {
    const clusters = clusterMarks(lane.marks, 200, 8);
    expect(clusters.map((c) => c.marks.length)).toEqual([2, 1]);
    expect(clusters[0].severity).toBe("error");
  });

  it("splits them again when zoomed in", () => {
    const clusters = clusterMarks(lane.marks, 2000, 8);
    expect(clusters).toHaveLength(3);
  });
});
