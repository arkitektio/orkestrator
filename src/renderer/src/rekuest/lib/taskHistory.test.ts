import { describe, expect, it, vi } from "vitest";

// Only the TaskEventKind enum is needed; the generated module drags in the
// Apollo client and `window`.
vi.mock("../api/graphql", () => ({
  TaskEventKind: {
    Queued: "QUEUED",
    Started: "STARTED",
    Progress: "PROGRESS",
    Log: "LOG",
    Yield: "YIELD",
    Effect: "EFFECT",
    Completed: "COMPLETED",
    Lost: "LOST",
    LateReport: "LATE_REPORT",
  },
}));

import { TaskEventKind } from "../api/graphql";
import {
  describeEffect,
  HistoryChild,
  HistoryEvent,
  isRiskyRerun,
  orderTaskHistory,
  readLostDetails,
} from "./taskHistory";

let clock = 0;
const at = () => `2026-09-30T10:00:${String(clock++).padStart(2, "0")}Z`;
const ev = (
  id: string,
  kind: TaskEventKind,
  step: number | null = null,
): HistoryEvent => ({ id, kind, step, createdAt: at() });
const child = (
  id: string,
  parentStep: number | null,
  createdAt = at(),
): HistoryChild => ({ id, parentStep, createdAt });

const ids = (attempt: { rows: { type: string; event?: { id: string }; child?: { id: string } }[] }) =>
  attempt.rows.map((r) => (r.type === "event" ? r.event!.id : `c:${r.child!.id}`));

describe("orderTaskHistory", () => {
  it("is one attempt for a task that ran once", () => {
    clock = 0;
    const events = [
      ev("q", TaskEventKind.Queued),
      ev("s", TaskEventKind.Started, 1),
      ev("y", TaskEventKind.Yield, 2),
      ev("c", TaskEventKind.Completed, 3),
    ];
    const attempts = orderTaskHistory(events.slice().reverse());
    expect(attempts).toHaveLength(1);
    expect(ids(attempts[0])).toEqual(["q", "s", "y", "c"]);
  });

  it("sorts a late journal resend into its step, server events stay put", () => {
    clock = 0;
    const events = [
      ev("q", TaskEventKind.Queued),
      ev("s", TaskEventKind.Started, 1),
      ev("p3", TaskEventKind.Progress, 3),
      // Resent from the agent's journal after a reconnect: arrives late.
      ev("p2", TaskEventKind.Progress, 2),
    ];
    expect(ids(orderTaskHistory(events)[0])).toEqual(["q", "s", "p2", "p3"]);
  });

  it("starts a new attempt when a workflow is sent again", () => {
    clock = 0;
    const events = [
      ev("q1", TaskEventKind.Queued),
      ev("s1", TaskEventKind.Started, 1),
      ev("n1", TaskEventKind.Effect, 2),
      ev("q2", TaskEventKind.Queued),
      ev("s2", TaskEventKind.Started, 3),
      ev("c", TaskEventKind.Completed, 4),
    ];
    const attempts = orderTaskHistory(events);
    expect(attempts.map((a) => a.index)).toEqual([0, 1]);
    expect(ids(attempts[0])).toEqual(["q1", "s1", "n1"]);
    expect(ids(attempts[1])).toEqual(["q2", "s2", "c"]);
  });

  it("places a child call at its parent step, across attempts", () => {
    clock = 0;
    const events = [
      ev("q1", TaskEventKind.Queued),
      ev("s1", TaskEventKind.Started, 1),
      ev("p2", TaskEventKind.Progress, 2),
      ev("q2", TaskEventKind.Queued),
      ev("s2", TaskEventKind.Started, 4),
      ev("y5", TaskEventKind.Yield, 6),
    ];
    const children = [child("late", 5), child("early", 3)];
    const attempts = orderTaskHistory(events, children);
    expect(ids(attempts[0])).toEqual(["q1", "s1", "p2", "c:early"]);
    expect(ids(attempts[1])).toEqual(["q2", "s2", "c:late", "y5"]);
  });

  it("keeps a call still in flight after the last stepped event", () => {
    clock = 0;
    const events = [
      ev("q", TaskEventKind.Queued),
      ev("s", TaskEventKind.Started, 1),
    ];
    expect(ids(orderTaskHistory(events, [child("k", 2)])[0])).toEqual([
      "q",
      "s",
      "c:k",
    ]);
  });

  it("places an unnumbered child by time", () => {
    clock = 0;
    const q = ev("q", TaskEventKind.Queued);
    const s = ev("s", TaskEventKind.Started);
    const k = child("k", null);
    const c = ev("c", TaskEventKind.Completed);
    expect(ids(orderTaskHistory([q, s, c], [k])[0])).toEqual([
      "q",
      "s",
      "c:k",
      "c",
    ]);
  });

  it("keeps a late report after the LOST it could not replace", () => {
    clock = 0;
    const events = [
      ev("q", TaskEventKind.Queued),
      ev("s", TaskEventKind.Started, 1),
      ev("lost", TaskEventKind.Lost),
      ev("late", TaskEventKind.LateReport, 2),
    ];
    expect(ids(orderTaskHistory(events)[0])).toEqual([
      "q",
      "s",
      "lost",
      "late",
    ]);
  });
});

describe("readLostDetails", () => {
  it("reads the server's snake_case value", () => {
    expect(
      readLostDetails({
        started: true,
        last_progress: 40,
        effects: "IRREVERSIBLE",
        reason: "agent disconnected",
      }),
    ).toEqual({
      started: true,
      lastProgress: 40,
      effects: "IRREVERSIBLE",
      reason: "agent disconnected",
    });
  });

  it("tolerates a partial, stringified or missing value", () => {
    expect(readLostDetails('{"started": false}')).toEqual({
      started: false,
      lastProgress: null,
      effects: null,
      reason: null,
    });
    expect(readLostDetails(null).started).toBeNull();
    expect(readLostDetails("not json").reason).toBeNull();
  });
});

describe("isRiskyRerun", () => {
  const lost = (started: boolean | null, effects: string | null) => ({
    started,
    effects,
    lastProgress: null,
    reason: null,
  });

  it("is safe when nothing ran", () => {
    expect(isRiskyRerun(lost(false, "IRREVERSIBLE"))).toBe(false);
  });

  it("is safe when the effects are declared harmless", () => {
    expect(isRiskyRerun(lost(true, "NONE"))).toBe(false);
    expect(isRiskyRerun(lost(true, "REPEATABLE"))).toBe(false);
  });

  it("is risky when it started and the effects are unknown or irreversible", () => {
    expect(isRiskyRerun(lost(true, "UNKNOWN"))).toBe(true);
    expect(isRiskyRerun(lost(true, "IRREVERSIBLE"))).toBe(true);
    expect(isRiskyRerun(lost(true, null))).toBe(true);
    // Not knowing whether it started is not knowing that nothing ran.
    expect(isRiskyRerun(lost(null, "IRREVERSIBLE"))).toBe(true);
  });
});

describe("describeEffect", () => {
  it("names each recorded value", () => {
    expect(describeEffect({ effect: "NOW", value: 1790715513.22 })).toMatch(
      /^took the time /,
    );
    expect(describeEffect({ effect: "SLEEP", value: 1790715513 })).toMatch(
      /^sleeps until /,
    );
    expect(
      describeEffect({ effect: "RANDOM", value: "0123456789abcdef0123" }),
    ).toBe("drew random 0123456789ab…");
    expect(describeEffect({ effect: "HOLD", key: "HOLD:1" })).toBe(
      "hold resumed by a person",
    );
    expect(describeEffect({ effect: "RECORD", value: { a: 1 } })).toBe(
      'recorded {"a":1}',
    );
  });
});
