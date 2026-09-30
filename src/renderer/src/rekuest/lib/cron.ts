/**
 * Five-field cron lines (minute hour day-of-month month day-of-week), as a
 * schedule stores them. Only what the schedule UI needs: validate a line,
 * say it in words, and preview when it next fires in the schedule's zone.
 * The backend is the authority on what it accepts; this parser follows the
 * common (Vixie) dialect: `*`, lists, ranges, steps, month and weekday
 * names, 7 = Sunday, and day-of-month OR day-of-week when both are set.
 */

type FieldSpec = { min: number; max: number; names?: string[] };

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const FIELDS: FieldSpec[] = [
  { min: 0, max: 59 },
  { min: 0, max: 23 },
  { min: 1, max: 31 },
  { min: 1, max: 12, names: MONTHS },
  { min: 0, max: 7, names: WEEKDAYS },
];

const FIELD_LABELS = ["minute", "hour", "day of month", "month", "day of week"];

export type CronField = { values: Set<number>; any: boolean };

export type ParsedCron = {
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
};

export type CronResult =
  | { ok: true; cron: ParsedCron }
  | { ok: false; error: string };

const parseValue = (raw: string, spec: FieldSpec): number | null => {
  const lower = raw.toLowerCase();
  if (spec.names) {
    const index = spec.names.indexOf(lower);
    if (index >= 0) return index + spec.min;
  }
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return value >= spec.min && value <= spec.max ? value : null;
};

const parseField = (raw: string, spec: FieldSpec, label: string): CronField | string => {
  const values = new Set<number>();
  for (const part of raw.split(",")) {
    const [range, stepRaw] = part.split("/");
    const step = stepRaw === undefined ? 1 : Number(stepRaw);
    if (!Number.isInteger(step) || step < 1 || (stepRaw !== undefined && !/^\d+$/.test(stepRaw))) {
      return `Bad step "${stepRaw}" in the ${label} field`;
    }
    let start: number | null;
    let end: number | null;
    if (range === "*") {
      start = spec.min;
      end = spec.max;
    } else if (range.includes("-")) {
      const [a, b] = range.split("-");
      start = parseValue(a, spec);
      end = parseValue(b, spec);
    } else {
      start = parseValue(range, spec);
      // "5/15" means from 5 to the end, every 15.
      end = stepRaw === undefined ? start : spec.max;
    }
    if (start === null || end === null || start > end) {
      return `"${part}" is not a valid ${label}`;
    }
    for (let v = start; v <= end; v += step) values.add(v);
  }
  return { values, any: raw === "*" };
};

export const parseCron = (line: string): CronResult => {
  const parts = line.trim().split(/\s+/).filter(Boolean);
  if (parts.length !== 5) {
    return {
      ok: false,
      error: `A cron line has 5 fields (minute hour day month weekday), this has ${parts.length}`,
    };
  }
  const fields: CronField[] = [];
  for (let i = 0; i < 5; i++) {
    const field = parseField(parts[i], FIELDS[i], FIELD_LABELS[i]);
    if (typeof field === "string") return { ok: false, error: field };
    fields.push(field);
  }
  // 7 is Sunday too.
  if (fields[4].values.delete(7)) fields[4].values.add(0);
  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;
  return { ok: true, cron: { minute, hour, dayOfMonth, month, dayOfWeek } };
};

// --- Next fires --------------------------------------------------------------

type LocalParts = { month: number; day: number; weekday: number; hour: number; minute: number };

const formatterCache = new Map<string, Intl.DateTimeFormat>();

const formatterFor = (timeZone: string) => {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
};

const localParts = (date: Date, timeZone: string): LocalParts => {
  const parts: Record<string, string> = {};
  for (const part of formatterFor(timeZone).formatToParts(date)) {
    parts[part.type] = part.value;
  }
  return {
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: WEEKDAYS.indexOf(parts.weekday.toLowerCase().slice(0, 3)),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
};

const dayMatches = (cron: ParsedCron, p: LocalParts) => {
  const dom = cron.dayOfMonth.values.has(p.day);
  const dow = cron.dayOfWeek.values.has(p.weekday);
  // Vixie cron: when both are restricted, either one matching is enough.
  if (!cron.dayOfMonth.any && !cron.dayOfWeek.any) return dom || dow;
  return dom && dow;
};

export const isValidTimeZone = (timeZone: string) => {
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
};

const MINUTE = 60_000;

/**
 * The next `count` instants the line fires at, read in `timeZone`, strictly
 * after `from`. Walks forward skipping whole days / hours that cannot match,
 * so a sparse line (once a year) is still cheap. Gives up after ~5 years.
 */
export const nextCronFires = (
  cron: ParsedCron,
  timeZone: string,
  from: Date,
  count: number,
): Date[] => {
  const fires: Date[] = [];
  let t = Math.floor(from.getTime() / MINUTE) * MINUTE + MINUTE;
  const limit = from.getTime() + 5 * 366 * 24 * 60 * MINUTE;
  while (fires.length < count && t < limit) {
    const p = localParts(new Date(t), timeZone);
    if (!cron.month.values.has(p.month) || !dayMatches(cron, p)) {
      // To the next local midnight.
      t += (24 * 60 - (p.hour * 60 + p.minute)) * MINUTE;
      continue;
    }
    if (!cron.hour.values.has(p.hour)) {
      t += (60 - p.minute) * MINUTE;
      continue;
    }
    if (cron.minute.values.has(p.minute)) fires.push(new Date(t));
    t += MINUTE;
  }
  return fires;
};

// --- Words ------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, "0");

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const sorted = (field: CronField) => [...field.values].sort((a, b) => a - b);

const joinWords = (words: string[]) =>
  words.length <= 1
    ? words.join("")
    : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;

/** An evenly stepped run covering the whole field, e.g. every 15 minutes. */
const evenStep = (field: CronField, min: number, max: number): number | null => {
  const v = sorted(field);
  if (v.length < 2 || v[0] !== min) return null;
  const step = v[1] - v[0];
  for (let i = 1; i < v.length; i++) if (v[i] - v[i - 1] !== step) return null;
  return v[v.length - 1] + step > max ? step : null;
};

const describeDays = (cron: ParsedCron): string => {
  const parts: string[] = [];
  if (!cron.dayOfWeek.any) {
    const days = sorted(cron.dayOfWeek);
    if (days.join() === "1,2,3,4,5") parts.push("on weekdays");
    else if (days.join() === "0,6") parts.push("on weekends");
    else parts.push(`on ${joinWords(days.map((d) => WEEKDAY_NAMES[d]))}`);
  }
  if (!cron.dayOfMonth.any) {
    const days = sorted(cron.dayOfMonth);
    const prefix = parts.length ? "or " : "";
    parts.push(`${prefix}on day ${joinWords(days.map(String))} of the month`);
  }
  if (!cron.month.any) {
    parts.push(`in ${joinWords(sorted(cron.month).map((m) => MONTH_NAMES[m - 1]))}`);
  }
  return parts.join(" ");
};

/** The line in words: "Every 15 minutes", "At 09:00 on weekdays". */
export const describeCron = (cron: ParsedCron): string => {
  const days = describeDays(cron);
  const suffix = days ? ` ${days}` : "";
  const minutes = sorted(cron.minute);
  const hours = sorted(cron.hour);

  if (cron.minute.any && cron.hour.any) return `Every minute${suffix}`;

  const minuteStep = evenStep(cron.minute, 0, 59);
  if (minuteStep && cron.hour.any) return `Every ${minuteStep} minutes${suffix}`;

  if (cron.hour.any && minutes.length === 1) {
    return minutes[0] === 0
      ? `Every hour${suffix}`
      : `Every hour at minute ${minutes[0]}${suffix}`;
  }

  const hourStep = evenStep(cron.hour, 0, 23);
  if (hourStep && minutes.length === 1) {
    return `Every ${hourStep} hours at minute ${minutes[0]}${suffix}`;
  }

  if (hours.length * minutes.length <= 6 && !cron.minute.any && !cron.hour.any) {
    const times = hours.flatMap((h) => minutes.map((m) => `${pad(h)}:${pad(m)}`));
    return `At ${joinWords(times)}${suffix}`;
  }

  return `At minute ${joinWords(minutes.map(String))} past hour ${joinWords(hours.map(String))}${suffix}`;
};

/** "Every 90 seconds", "Every 2 hours", "Every day". */
export const describeInterval = (seconds: number): string => {
  const units: [number, string][] = [
    [7 * 24 * 3600, "week"],
    [24 * 3600, "day"],
    [3600, "hour"],
    [60, "minute"],
    [1, "second"],
  ];
  for (const [size, name] of units) {
    if (seconds % size === 0) {
      const n = seconds / size;
      return n === 1 ? `Every ${name}` : `Every ${n} ${name}s`;
    }
  }
  return `Every ${seconds} seconds`;
};

/** How a schedule recurs, in words, whichever way it is set. */
export const describeCadence = (schedule: {
  cron?: string | null;
  intervalSeconds?: number | null;
  timezone?: string | null;
}): string => {
  if (schedule.cron) {
    const parsed = parseCron(schedule.cron);
    if (!parsed.ok) return schedule.cron;
    const zone =
      schedule.timezone && schedule.timezone !== "UTC" ? ` (${schedule.timezone})` : "";
    const utc = schedule.timezone === "UTC" ? " UTC" : "";
    return `${describeCron(parsed.cron)}${utc}${zone}`;
  }
  if (schedule.intervalSeconds) return describeInterval(schedule.intervalSeconds);
  return "No cadence";
};

export const CRON_PRESETS: { label: string; cron: string }[] = [
  { label: "Every 15 min", cron: "*/15 * * * *" },
  { label: "Hourly", cron: "0 * * * *" },
  { label: "Daily 09:00", cron: "0 9 * * *" },
  { label: "Weekdays 09:00", cron: "0 9 * * 1-5" },
  { label: "Midnight", cron: "0 0 * * *" },
  { label: "Mondays 08:00", cron: "0 8 * * 1" },
  { label: "1st of month", cron: "0 0 1 * *" },
];

// --- Editor state -------------------------------------------------------------

export type IntervalUnit = "minutes" | "hours" | "days";

export const UNIT_SECONDS: Record<IntervalUnit, number> = {
  minutes: 60,
  hours: 3600,
  days: 86400,
};

/** A schedule's cadence as the editor holds it: both modes keep their input. */
export type CadenceDraft = {
  mode: "interval" | "cron";
  every: number;
  unit: IntervalUnit;
  cron: string;
  timezone: string;
};

export const localTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export const defaultCadence = (): CadenceDraft => ({
  mode: "cron",
  every: 1,
  unit: "hours",
  cron: "0 9 * * 1-5",
  timezone: localTimeZone(),
});

export const cadenceFromSchedule = (schedule: {
  cron?: string | null;
  intervalSeconds?: number | null;
  timezone: string;
}): CadenceDraft => {
  const draft = { ...defaultCadence(), timezone: schedule.timezone };
  if (schedule.cron) return { ...draft, mode: "cron", cron: schedule.cron };
  const seconds = schedule.intervalSeconds ?? 3600;
  const unit: IntervalUnit =
    seconds % UNIT_SECONDS.days === 0
      ? "days"
      : seconds % UNIT_SECONDS.hours === 0
        ? "hours"
        : "minutes";
  return {
    ...draft,
    mode: "interval",
    unit,
    every: Math.max(1, Math.round(seconds / UNIT_SECONDS[unit])),
  };
};

export type CadenceInput = {
  cron: string | null;
  intervalSeconds: number | null;
  timezone: string;
};

/** The draft as the create/update inputs take it: exactly one of cron or intervalSeconds. */
export const cadenceToInput = (
  draft: CadenceDraft,
): { ok: true; input: CadenceInput } | { ok: false; error: string } => {
  if (!isValidTimeZone(draft.timezone)) {
    return { ok: false, error: `"${draft.timezone}" is not a time zone` };
  }
  if (draft.mode === "cron") {
    const parsed = parseCron(draft.cron);
    if (!parsed.ok) return parsed;
    return {
      ok: true,
      input: { cron: draft.cron.trim().split(/\s+/).join(" "), intervalSeconds: null, timezone: draft.timezone },
    };
  }
  if (!Number.isInteger(draft.every) || draft.every < 1) {
    return { ok: false, error: "Run at least every 1 " + draft.unit.replace(/s$/, "") };
  }
  return {
    ok: true,
    input: {
      cron: null,
      intervalSeconds: draft.every * UNIT_SECONDS[draft.unit],
      timezone: draft.timezone,
    },
  };
};
