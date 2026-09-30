import { describe, expect, it } from "vitest";
import { scheduleState, triggerState } from "./automationStatus";

const now = Date.parse("2026-09-29T10:00:00Z");

describe("scheduleState", () => {
  const base = { enabled: true, consecutiveFailures: 0 };

  it("puts paused before failing before the run", () => {
    expect(scheduleState({ ...base, enabled: false, consecutiveFailures: 2 }, now)).toBe("paused");
    expect(scheduleState({ ...base, consecutiveFailures: 1 }, now)).toBe("failing");
  });

  it("tells a waiting run from an executing one", () => {
    expect(
      scheduleState({ ...base, nextRun: { notBefore: "2026-09-29T11:00:00Z", isDone: false } }, now),
    ).toBe("waiting");
    expect(
      scheduleState({ ...base, nextRun: { notBefore: "2026-09-29T09:00:00Z", isDone: false } }, now),
    ).toBe("running");
    expect(scheduleState({ ...base, nextRun: null }, now)).toBe("idle");
  });
});

describe("triggerState", () => {
  it("is active unless paused or failing", () => {
    expect(triggerState({ enabled: true, consecutiveFailures: 0 })).toBe("waiting");
    expect(triggerState({ enabled: true, consecutiveFailures: 3 })).toBe("failing");
    expect(triggerState({ enabled: false, consecutiveFailures: 3 })).toBe("paused");
  });
});
