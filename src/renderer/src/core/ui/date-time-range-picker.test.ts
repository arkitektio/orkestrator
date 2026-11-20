import { describe, expect, it } from "vitest";
import { formatRange, presetOfRange, presetRange } from "./date-time-range-picker";

// A Wednesday.
const NOW = new Date(2026, 10, 18, 15, 30, 0);
const at = (month: number, day: number, hours = 0, minutes = 0, seconds = 0, ms = 0) =>
  new Date(2026, month, day, hours, minutes, seconds, ms);

describe("presetRange", () => {
  it("counts a moving window back from now", () => {
    const { from, to } = presetRange("last1h", NOW);
    expect(to?.getTime()).toBe(NOW.getTime());
    expect(NOW.getTime() - from!.getTime()).toBe(60 * 60_000);
  });

  it("covers whole days", () => {
    expect(presetRange("yesterday", NOW)).toEqual({ from: at(10, 17), to: at(10, 17, 23, 59, 59, 999) });
    expect(presetRange("last7", NOW)).toEqual({ from: at(10, 12), to: at(10, 18, 23, 59, 59, 999) });
  });

  it("takes last week Sunday to Saturday and last month whole", () => {
    expect(presetRange("lastWeek", NOW)).toEqual({ from: at(10, 8), to: at(10, 14, 23, 59, 59, 999) });
    expect(presetRange("lastMonth", NOW)).toEqual({ from: at(9, 1), to: at(9, 31, 23, 59, 59, 999) });
  });

  it("refuses a name it does not know", () => {
    expect(() => presetRange("nope", NOW)).toThrow();
  });
});

describe("presetOfRange", () => {
  it("recognises a day preset from the range alone", () => {
    expect(presetOfRange(presetRange("lastWeek", NOW), NOW)).toBe("lastWeek");
    expect(presetOfRange({ from: at(10, 3), to: at(10, 5) }, NOW)).toBeUndefined();
  });

  it("knows nothing about an open or empty range", () => {
    expect(presetOfRange({ from: undefined, to: undefined }, NOW)).toBeUndefined();
    expect(presetOfRange({ from: at(10, 18), to: undefined }, NOW)).toBeUndefined();
  });
});

describe("formatRange", () => {
  it("says an empty range does not narrow", () => {
    expect(formatRange({ from: undefined, to: undefined }, "en-US", NOW)).toBe("Any time");
  });

  it("names whole days by their dates, one date for a single day", () => {
    expect(formatRange({ from: at(10, 3), to: at(10, 9, 23, 59, 59, 999) }, "en-US", NOW)).toBe("Nov 3 – Nov 9");
    expect(formatRange({ from: at(10, 3), to: at(10, 3, 23, 59, 59, 999) }, "en-US", NOW)).toBe("Nov 3");
  });

  it("adds the times once they were set, and the year when it is another", () => {
    expect(formatRange({ from: at(10, 3, 14, 0), to: at(10, 3, 16, 30) }, "en-US", NOW)).toMatch(
      /^Nov 3, 2:00\sPM – Nov 3, 4:30\sPM$/,
    );
    expect(formatRange({ from: new Date(2025, 0, 2), to: new Date(2025, 0, 4, 23, 59) }, "en-US", NOW)).toBe(
      "Jan 2, 2025 – Jan 4, 2025",
    );
  });

  it("reads an open range as since", () => {
    expect(formatRange({ from: at(10, 3), to: undefined }, "en-US", NOW)).toBe("Since Nov 3");
  });
});
