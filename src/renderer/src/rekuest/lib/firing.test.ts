import { describe, expect, it } from "vitest";
import { FiringOutcome } from "../api/graphql";
import { describeFiring } from "./firing";

describe("describeFiring", () => {
  it("is plain when it started a run that is still kept", () => {
    expect(describeFiring({ outcome: FiringOutcome.Fired, replay: false, task: { id: "1" } })).toEqual({
      label: "Fired",
      tone: "plain",
      note: null,
    });
    expect(describeFiring({ outcome: FiringOutcome.Fired, replay: false, task: null }).tone).toBe("muted");
  });

  it("says why a signal was turned away or the run failed", () => {
    expect(
      describeFiring({ outcome: FiringOutcome.Rejected, reason: "debounced", replay: false }),
    ).toEqual({ label: "Rejected", tone: "muted", note: "debounced" });
    expect(
      describeFiring({ outcome: FiringOutcome.Failed, reason: "no agent", replay: true }),
    ).toEqual({ label: "Failed", tone: "error", note: "no agent · by hand" });
  });
});
