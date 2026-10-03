import { describe, expect, it } from "vitest";
import {
  cadenceFromSchedule,
  cadenceToInput,
  cronFiresOnDay,
  cronFromSimple,
  describeCadence,
  describeCron,
  describeInterval,
  nextCronFires,
  parseCron,
  simpleFromCron,
  type ParsedCron,
} from "./cron";

const parsed = (line: string): ParsedCron => {
  const result = parseCron(line);
  if (!result.ok) throw new Error(result.error);
  return result.cron;
};

describe("parseCron", () => {
  it("expands lists, ranges, steps and names", () => {
    const cron = parsed("*/15 9-17 1,15 jan-mar mon-fri");
    expect([...cron.minute.values]).toEqual([0, 15, 30, 45]);
    expect([...cron.hour.values]).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
    expect([...cron.dayOfMonth.values]).toEqual([1, 15]);
    expect([...cron.month.values]).toEqual([1, 2, 3]);
    expect([...cron.dayOfWeek.values]).toEqual([1, 2, 3, 4, 5]);
  });

  it("reads 7 as Sunday", () => {
    expect([...parsed("0 0 * * 7").dayOfWeek.values]).toEqual([0]);
  });

  it("reads a start with a step as running to the end", () => {
    expect([...parsed("5/20 * * * *").minute.values]).toEqual([5, 25, 45]);
  });

  it("rejects the wrong field count and out-of-range values", () => {
    expect(parseCron("* * * *").ok).toBe(false);
    expect(parseCron("60 * * * *").ok).toBe(false);
    expect(parseCron("* 24 * * *").ok).toBe(false);
    expect(parseCron("*/0 * * * *").ok).toBe(false);
    expect(parseCron("5-1 * * * *").ok).toBe(false);
  });
});

describe("describeCron", () => {
  it.each([
    ["* * * * *", "Every minute"],
    ["*/15 * * * *", "Every 15 minutes"],
    ["0 * * * *", "Every hour"],
    ["30 * * * *", "Every hour at minute 30"],
    ["0 */6 * * *", "Every 6 hours at minute 0"],
    ["0 9 * * *", "At 09:00"],
    ["0 9 * * 1-5", "At 09:00 on weekdays"],
    ["30 8 * * 1", "At 08:30 on Monday"],
    ["0 0 1 * *", "At 00:00 on day 1 of the month"],
    ["0 9,17 * * *", "At 09:00 and 17:00"],
  ])("%s → %s", (line, words) => {
    expect(describeCron(parsed(line))).toBe(words);
  });
});

describe("nextCronFires", () => {
  const from = new Date("2026-09-29T10:07:30Z"); // a Tuesday

  it("steps within the hour", () => {
    const fires = nextCronFires(parsed("*/15 * * * *"), "UTC", from, 3);
    expect(fires.map((d) => d.toISOString())).toEqual([
      "2026-09-29T10:15:00.000Z",
      "2026-09-29T10:30:00.000Z",
      "2026-09-29T10:45:00.000Z",
    ]);
  });

  it("reads the line in the schedule's zone", () => {
    // 09:00 in Berlin is 07:00 UTC in summer time.
    const fires = nextCronFires(parsed("0 9 * * *"), "Europe/Berlin", from, 2);
    expect(fires.map((d) => d.toISOString())).toEqual([
      "2026-09-30T07:00:00.000Z",
      "2026-10-01T07:00:00.000Z",
    ]);
  });

  it("skips to matching weekdays", () => {
    const fires = nextCronFires(parsed("0 8 * * 1"), "UTC", from, 1);
    expect(fires[0].toISOString()).toBe("2026-10-05T08:00:00.000Z");
  });

  it("matches day-of-month OR day-of-week when both are set", () => {
    // Thursday Oct 1 (the 1st) and Monday Oct 5.
    const fires = nextCronFires(parsed("0 0 1 * 1"), "UTC", from, 2);
    expect(fires.map((d) => d.toISOString())).toEqual([
      "2026-10-01T00:00:00.000Z",
      "2026-10-05T00:00:00.000Z",
    ]);
  });

  it("finds a sparse line without walking every minute", () => {
    const fires = nextCronFires(parsed("0 0 29 2 *"), "UTC", from, 1);
    expect(fires[0].toISOString()).toBe("2028-02-29T00:00:00.000Z");
  });
});

describe("cadence words", () => {
  it("names intervals by their largest whole unit", () => {
    expect(describeInterval(60)).toBe("Every minute");
    expect(describeInterval(90)).toBe("Every 90 seconds");
    expect(describeInterval(7200)).toBe("Every 2 hours");
    expect(describeInterval(86400)).toBe("Every day");
  });

  it("describes either kind of schedule", () => {
    expect(describeCadence({ intervalSeconds: 300 })).toBe("Every 5 minutes");
    expect(describeCadence({ cron: "0 9 * * *", timezone: "UTC" })).toBe("At 09:00 UTC");
    expect(describeCadence({ cron: "0 9 * * *", timezone: "Europe/Berlin" })).toBe(
      "At 09:00 (Europe/Berlin)",
    );
  });
});

describe("cadence drafts", () => {
  it("round-trips an interval through the editor", () => {
    const draft = cadenceFromSchedule({ intervalSeconds: 7200, timezone: "UTC" });
    expect(draft).toMatchObject({ mode: "interval", every: 2, unit: "hours" });
    expect(cadenceToInput(draft)).toEqual({
      ok: true,
      input: { cron: null, intervalSeconds: 7200, timezone: "UTC" },
    });
  });

  it("sends a normalised cron line and clears the interval", () => {
    const draft = { ...cadenceFromSchedule({ cron: "0 9 * * *", timezone: "UTC" }), cron: " 0  9 * * * " };
    expect(cadenceToInput(draft)).toEqual({
      ok: true,
      input: { cron: "0 9 * * *", intervalSeconds: null, timezone: "UTC" },
    });
  });

  it("refuses a bad line, interval or zone", () => {
    const base = cadenceFromSchedule({ cron: "0 9 * * *", timezone: "UTC" });
    expect(cadenceToInput({ ...base, cron: "nope" }).ok).toBe(false);
    expect(cadenceToInput({ ...base, mode: "interval", every: 0 }).ok).toBe(false);
    expect(cadenceToInput({ ...base, timezone: "Mars/Olympus" }).ok).toBe(false);
  });
});

describe("simple cadences", () => {
  it("reads a time of day, on weekdays or on days of the month", () => {
    expect(simpleFromCron("30 7 * * *")).toEqual({ kind: "daily", hour: 7, minute: 30 });
    expect(simpleFromCron("0 9 * * 1-5")).toEqual({
      kind: "weekly",
      hour: 9,
      minute: 0,
      weekdays: [1, 2, 3, 4, 5],
    });
    expect(simpleFromCron("0 0 1,15 * *")).toEqual({
      kind: "monthly",
      hour: 0,
      minute: 0,
      days: [1, 15],
    });
  });

  it("gives up on anything a simple cadence cannot say", () => {
    expect(simpleFromCron("*/15 * * * *")).toBeNull();
    expect(simpleFromCron("0 9,17 * * *")).toBeNull();
    expect(simpleFromCron("0 9 1 * 1")).toBeNull();
    expect(simpleFromCron("0 9 * 6 *")).toBeNull();
    expect(simpleFromCron("nonsense")).toBeNull();
  });

  it("round-trips through the line", () => {
    for (const line of ["30 7 * * *", "0 9 * * 1,3,5", "15 18 1,31 * *"]) {
      const simple = simpleFromCron(line);
      expect(simple).not.toBeNull();
      expect(cronFromSimple(simple!)).toBe(line);
    }
    expect(cronFromSimple({ kind: "weekly", hour: 9, minute: 0, weekdays: [5, 1, 1] })).toBe(
      "0 9 * * 1,5",
    );
  });

  it("marks the days a line fires on", () => {
    const of = (line: string) => {
      const parsed = parseCron(line);
      if (!parsed.ok) throw new Error(parsed.error);
      return parsed.cron;
    };
    // 2026-10-05 is a Monday.
    expect(cronFiresOnDay(of("0 9 * * 1-5"), new Date(2026, 9, 5))).toBe(true);
    expect(cronFiresOnDay(of("0 9 * * 1-5"), new Date(2026, 9, 4))).toBe(false);
    expect(cronFiresOnDay(of("0 0 31 * *"), new Date(2026, 9, 31))).toBe(true);
    expect(cronFiresOnDay(of("0 0 31 * *"), new Date(2026, 10, 30))).toBe(false);
    expect(cronFiresOnDay(of("0 0 * 6 *"), new Date(2026, 9, 5))).toBe(false);
  });
});
