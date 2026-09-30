import { describe, expect, it } from "vitest";
import {
  bboxOf,
  circleRing,
  formatDayTitle,
  formatDistance,
  formatDuration,
  isoDate,
  lineCoordinates,
  parseIsoDate,
  shiftDay,
} from "./format";

describe("lokate format", () => {
  it("formats distances in meters and kilometers", () => {
    expect(formatDistance(null)).toBe("");
    expect(formatDistance(849.6)).toBe("850 m");
    expect(formatDistance(12_400)).toBe("12.4 km");
    expect(formatDistance(128_300)).toBe("128 km");
  });

  it("formats durations from seconds", () => {
    expect(formatDuration(30)).toBe("<1 min");
    expect(formatDuration(45 * 60)).toBe("45 min");
    expect(formatDuration(2 * 3600)).toBe("2 h");
    expect(formatDuration(2 * 3600 + 5 * 60)).toBe("2 h 5 min");
    expect(formatDuration(3 * 86400 + 4 * 3600)).toBe("3 d 4 h");
  });

  it("round-trips local dates without drifting through UTC", () => {
    const date = new Date(2026, 0, 31);
    expect(isoDate(date)).toBe("2026-01-31");
    expect(parseIsoDate("2026-01-31")?.getTime()).toBe(date.getTime());
    expect(parseIsoDate("31.01.2026")).toBeNull();
    expect(parseIsoDate(undefined)).toBeNull();
  });

  it("steps days across month ends", () => {
    expect(isoDate(shiftDay(new Date(2026, 0, 31), 1))).toBe("2026-02-01");
    expect(isoDate(shiftDay(new Date(2026, 2, 1), -1))).toBe("2026-02-28");
  });

  it("names today and yesterday", () => {
    const now = new Date(2026, 8, 30, 12);
    expect(formatDayTitle(new Date(2026, 8, 30), now)).toBe("Today");
    expect(formatDayTitle(new Date(2026, 8, 29), now)).toBe("Yesterday");
  });

  it("frames coordinates", () => {
    expect(bboxOf([])).toBeNull();
    expect(
      bboxOf([
        [16.3, 48.2],
        [16.4, 48.1],
      ]),
    ).toEqual([16.3, 48.1, 16.4, 48.2]);
  });

  it("draws a closed circle of the right size", () => {
    const ring = circleRing(48.2, 16.37, 100);
    expect(ring[0][0]).toBeCloseTo(ring[ring.length - 1][0], 9);
    expect(ring[0][1]).toBeCloseTo(ring[ring.length - 1][1], 9);
    // North of the centre by ~100 m is ~0.0009° of latitude.
    expect(ring[0][1] - 48.2).toBeCloseTo(0.0009, 4);
  });

  it("reads a track's line, and nothing from anything else", () => {
    expect(lineCoordinates('{"type":"LineString","coordinates":[[16.3,48.2],[16.4,48.1]]}')).toEqual([
      [16.3, 48.2],
      [16.4, 48.1],
    ]);
    expect(lineCoordinates('{"type":"Point","coordinates":[1,2]}')).toEqual([]);
    expect(lineCoordinates("not json")).toEqual([]);
  });
});
