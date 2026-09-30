import { describe, expect, it } from "vitest";
import { formatAt, retentionChoices, retentionFromValue, retentionLabel, retentionValue } from "./format";

describe("lokate format", () => {
  it("names retentions in days and years", () => {
    expect(retentionLabel(null)).toBe("Forever");
    expect(retentionLabel(undefined)).toBe("Forever");
    expect(retentionLabel(1)).toBe("1 day");
    expect(retentionLabel(30)).toBe("30 days");
    expect(retentionLabel(365)).toBe("1 year");
    expect(retentionLabel(730)).toBe("2 years");
  });

  it("adds a custom server retention to the choices, in order", () => {
    expect(retentionChoices(30)).toEqual([null, 7, 30, 90, 180, 365, 730]);
    expect(retentionChoices(null)).toEqual([null, 7, 30, 90, 180, 365, 730]);
    expect(retentionChoices(45)).toEqual([null, 7, 30, 45, 90, 180, 365, 730]);
    expect(retentionChoices(undefined)).toEqual([null, 7, 30, 90, 180, 365, 730]);
  });

  it("round-trips select values", () => {
    expect(retentionFromValue(retentionValue(null))).toBeNull();
    expect(retentionFromValue(retentionValue(90))).toBe(90);
  });

  it("shows only the time for today's reads", () => {
    const now = new Date(2026, 8, 30, 18, 0);
    expect(formatAt(new Date(2026, 8, 30, 9, 5).toISOString(), now)).not.toMatch(/Sep/);
    expect(formatAt(new Date(2026, 8, 12, 9, 5).toISOString(), now)).toMatch(/12/);
  });
});
