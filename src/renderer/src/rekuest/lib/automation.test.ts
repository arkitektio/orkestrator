import { describe, expect, it } from "vitest";
import { DescriptorOperator, SignalKind } from "../api/graphql";
import {
  describeDraft,
  scheduleRow,
  sortAutomations,
  triggerRow,
} from "./automation";

const now = Date.parse("2026-10-03T10:00:00Z");

const schedule = {
  id: "1",
  name: "Morning sync",
  enabled: true,
  cron: "0 9 * * 1-5",
  timezone: "UTC",
  consecutiveFailures: 0,
  action: { id: "a", name: "Sync folder" },
};

const trigger = {
  id: "2",
  name: "Segment new images",
  enabled: true,
  identifier: "@mikro/image",
  kind: SignalKind.Created,
  conditions: [{ key: "kind", operator: DescriptorOperator.Equals, value: "raw" }],
  consecutiveFailures: 0,
  action: { id: "b", name: "Segment nuclei" },
  agent: { id: "g", name: "cellpose" },
};

describe("scheduleRow", () => {
  it("says the cadence and the waiting run's time", () => {
    const row = scheduleRow(
      {
        ...schedule,
        nextRun: { notBefore: "2026-10-03T13:00:00Z", isDone: false },
        lastRunAt: "2026-10-02T09:00:00Z",
      },
      now,
    );
    expect(row.kind).toBe("clock");
    expect(row.identifier).toBe("@rekuest/schedule");
    expect(row.when).toBe("At 09:00 on weekdays UTC");
    expect(row.state).toBe("waiting");
    expect(row.nextAt).toBe("2026-10-03T13:00:00Z");
    expect(row.lastRunAt).toBe("2026-10-02T09:00:00Z");
  });

  it("gives no next time unless it is waiting", () => {
    const run = { notBefore: "2026-10-03T13:00:00Z", isDone: false };
    expect(scheduleRow({ ...schedule, enabled: false, nextRun: run }, now).nextAt).toBeNull();
    expect(scheduleRow({ ...schedule, nextRun: null }, now).nextAt).toBeNull();
  });
});

describe("triggerRow", () => {
  it("says the signal and each condition", () => {
    const row = triggerRow(trigger);
    expect(row.kind).toBe("signal");
    expect(row.identifier).toBe("@rekuest/trigger");
    expect(row.when).toBe("When @mikro/image is created");
    expect(row.onlyIf).toEqual(["kind is raw"]);
    expect(row.lastRunAt).toBeNull();
  });

  it("survives conditions it cannot read", () => {
    expect(triggerRow({ ...trigger, conditions: "nonsense" }).onlyIf).toEqual([]);
  });
});

describe("sortAutomations", () => {
  it("puts failing first and paused last, then by name", () => {
    const rows = [
      triggerRow({ ...trigger, id: "p", name: "A paused", enabled: false }),
      triggerRow({ ...trigger, id: "z", name: "Zeta" }),
      triggerRow({ ...trigger, id: "f", name: "Broken", consecutiveFailures: 2 }),
      scheduleRow({ ...schedule, id: "a", name: "Alpha" }, now),
    ];
    expect(sortAutomations(rows).map((row) => row.id)).toEqual(["f", "a", "z", "p"]);
  });

  it("carries a rule's limit, and ranks an ended rule with the paused ones", () => {
    const ended = triggerRow({ ...trigger, id: "e", name: "Done", exhausted: true, runCount: 3, maxRuns: 3 });
    expect(ended.state).toBe("ended");
    expect([ended.runCount, ended.maxRuns]).toEqual([3, 3]);
    const rows = [ended, triggerRow({ ...trigger, id: "z", name: "Zeta" })];
    expect(sortAutomations(rows).map((row) => row.id)).toEqual(["z", "e"]);
  });
});

describe("describeDraft", () => {
  it("reads a clock rule", () => {
    expect(describeDraft({ kind: "clock", cadence: "Every 15 minutes", action: "Sync" })).toBe(
      "Every 15 minutes, run Sync",
    );
  });

  it("reads a signal rule with its conditions", () => {
    expect(
      describeDraft({
        kind: "signal",
        signal: { identifier: "@mikro/image", kind: SignalKind.Updated },
        conditions: ["kind is raw", "channels ≥ 3"],
        action: "Segment",
      }),
    ).toBe("When @mikro/image is updated and kind is raw and channels ≥ 3, run Segment");
  });

  it("leaves a gap for what is not chosen yet", () => {
    expect(describeDraft({ kind: "signal" })).toBe("When something changes, run …");
    expect(describeDraft({ kind: "clock" })).toBe("On a clock, run …");
  });
});
