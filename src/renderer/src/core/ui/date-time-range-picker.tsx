import React, { useEffect, useState } from "react";
import { CalendarDays, Check } from "lucide-react";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { FilterTrigger } from "./filter-bar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@/core/util/utils";

export interface DateRangePickerProps {
  /** Called with the range once it is chosen: a preset, Apply, Clear, or closing the popover. */
  onUpdate?: (values: { range: DateRange }) => void;
  /** The range the page holds (its link, its state); the picker follows it. */
  initialDateFrom?: Date | string;
  initialDateTo?: Date | string;
  /** Alignment of popover */
  align?: "start" | "center" | "end";
  /** Option for locale */
  locale?: string;
}

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

type Preset = { name: string; label: string; type: "time" | "date" };

export const PRESETS: Preset[] = [
  { name: "last15", label: "Last 15 minutes", type: "time" },
  { name: "last1h", label: "Last hour", type: "time" },
  { name: "last6h", label: "Last 6 hours", type: "time" },
  { name: "last24h", label: "Last 24 hours", type: "time" },
  { name: "today", label: "Today", type: "date" },
  { name: "yesterday", label: "Yesterday", type: "date" },
  { name: "last7", label: "Last 7 days", type: "date" },
  { name: "thisWeek", label: "This week", type: "date" },
  { name: "lastWeek", label: "Last week", type: "date" },
  { name: "thisMonth", label: "This month", type: "date" },
  { name: "lastMonth", label: "Last month", type: "date" },
];

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};
const endOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};
const daysFrom = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

/** The range a preset stands for, counted back from `now`. Weeks start on Sunday. */
export const presetRange = (name: string, now: Date = new Date()): DateRange => {
  const back = (ms: number) => ({ from: new Date(now.getTime() - ms), to: new Date(now) });
  const MINUTE = 60_000;
  switch (name) {
    case "last15":
      return back(15 * MINUTE);
    case "last1h":
      return back(60 * MINUTE);
    case "last6h":
      return back(6 * 60 * MINUTE);
    case "last24h":
      return back(24 * 60 * MINUTE);
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday":
      return { from: startOfDay(daysFrom(now, -1)), to: endOfDay(daysFrom(now, -1)) };
    case "last7":
      return { from: startOfDay(daysFrom(now, -6)), to: endOfDay(now) };
    case "thisWeek":
      return { from: startOfDay(daysFrom(now, -now.getDay())), to: endOfDay(now) };
    case "lastWeek":
      return {
        from: startOfDay(daysFrom(now, -now.getDay() - 7)),
        to: endOfDay(daysFrom(now, -now.getDay() - 1)),
      };
    case "thisMonth":
      return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: endOfDay(now) };
    case "lastMonth":
      return {
        from: startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    default:
      throw new Error(`Unknown date range preset: ${name}`);
  }
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * The day preset a range is, if any: whole days are recognised from the
 * range itself, so a link that carries one still reads "Last week". A "last
 * hour" is a moving window and is only known while it was just picked.
 */
export const presetOfRange = (range: DateRange, now: Date = new Date()): string | undefined => {
  const { from, to } = range;
  if (!from || !to) return undefined;
  return PRESETS.filter((preset) => preset.type === "date").find((preset) => {
    const candidate = presetRange(preset.name, now);
    return sameDay(candidate.from!, from) && sameDay(candidate.to!, to);
  })?.name;
};

const wholeDays = (range: DateRange) =>
  !!range.from &&
  range.from.getHours() === 0 &&
  range.from.getMinutes() === 0 &&
  (!range.to || (range.to.getHours() === 23 && range.to.getMinutes() === 59));

/**
 * A range in as few words as say it: "Nov 3 – Nov 9" for whole days (one
 * date when it is a single day), the times only when they were set, the year
 * only when it is not this one.
 */
export const formatRange = (range: DateRange, locale = "en-US", now: Date = new Date()): string => {
  const { from, to } = range;
  if (!from) return "Any time";
  const days = wholeDays(range);
  const format = (date: Date) =>
    date.toLocaleString(locale, {
      month: "short",
      day: "numeric",
      ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
      ...(days ? {} : { hour: "numeric", minute: "2-digit" }),
    });
  if (!to) return `Since ${format(from)}`;
  if (days && sameDay(from, to)) return format(from);
  return `${format(from)} – ${format(to)}`;
};

const toDate = (value: Date | string | undefined) => (value ? new Date(value) : undefined);
const timeKey = (value: Date | string | undefined) => (value ? new Date(value).getTime() : null);

const pad = (n: number) => n.toString().padStart(2, "0");

/** One end's time of day, as a native time field in the pill's shape. */
const TimeField = ({ label, date, onChange }: { label: string; date: Date; onChange: (date: Date) => void }) => (
  <label className="flex items-center gap-2 text-xs text-muted-foreground">
    {label}
    <input
      type="time"
      value={`${pad(date.getHours())}:${pad(date.getMinutes())}`}
      onChange={(event) => {
        const [hours, minutes] = event.target.value.split(":").map(Number);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return;
        const next = new Date(date);
        next.setHours(hours, minutes, 0, 0);
        onChange(next);
      }}
      className="h-8 rounded-full border border-input bg-transparent px-3 text-sm tabular-nums text-foreground outline-none focus-visible:border-primary/50"
    />
  </label>
);

/**
 * A "when" filter, in the filter row's own pill (`FilterTrigger`): quiet
 * while it does not narrow ("Any time"), tinted once it does.
 *
 * The popover is two halves. On the left the ranges people actually ask for;
 * picking one applies it and closes. On the right a calendar for anything
 * else, with the two times under it once days are picked, and Apply. Clear
 * drops the range. Closing the popover applies what is drawn, as before.
 *
 * The picker follows the range it is given, so a page's "Clear filters"
 * empties it too.
 */
export const DateTimeRangePicker = ({
  initialDateFrom,
  initialDateTo,
  onUpdate,
  align = "end",
  locale = "en-US",
}: DateRangePickerProps): React.JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);
  const [range, setRange] = useState<DateRange>({ from: toDate(initialDateFrom), to: toDate(initialDateTo) });
  // A moving window ("Last hour") that was just picked; day presets are read off the range.
  const [pickedPreset, setPickedPreset] = useState<string | undefined>(undefined);

  // Follow the page: a cleared link clears the pill.
  const fromKey = timeKey(initialDateFrom);
  const toKey = timeKey(initialDateTo);
  useEffect(() => {
    setRange((current) => {
      if ((current.from?.getTime() ?? null) === fromKey && (current.to?.getTime() ?? null) === toKey) return current;
      setPickedPreset(undefined);
      return {
        from: fromKey === null ? undefined : new Date(fromKey),
        to: toKey === null ? undefined : new Date(toKey),
      };
    });
  }, [fromKey, toKey]);

  const preset = pickedPreset ?? presetOfRange(range);
  const presetLabel = PRESETS.find((candidate) => candidate.name === preset)?.label;

  const commit = (next: DateRange, picked?: string) => {
    setRange(next);
    setPickedPreset(picked);
    onUpdate?.({ range: next });
    setIsOpen(false);
  };

  const handleDateSelect = (value: { from?: Date; to?: Date } | undefined) => {
    setPickedPreset(undefined);
    if (!value?.from) {
      setRange({ from: undefined, to: undefined });
      return;
    }
    // Days come from the calendar; an end keeps the time it already had.
    const from = new Date(value.from);
    if (range.from) from.setHours(range.from.getHours(), range.from.getMinutes(), 0, 0);
    else from.setHours(0, 0, 0, 0);
    let to: Date | undefined;
    if (value.to) {
      to = new Date(value.to);
      if (range.to) to.setHours(range.to.getHours(), range.to.getMinutes(), 59, 999);
      else to.setHours(23, 59, 59, 999);
    }
    setRange({ from, to });
  };

  const presetGroup = (type: Preset["type"], heading: string) => (
    <div className="flex flex-col gap-0.5">
      <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{heading}</p>
      {PRESETS.filter((candidate) => candidate.type === type).map((candidate) => {
        const selected = preset === candidate.name;
        return (
          <button
            key={candidate.name}
            type="button"
            onClick={() => commit(presetRange(candidate.name), candidate.name)}
            className={cn(
              "flex h-8 items-center justify-between gap-3 rounded-full px-2.5 text-left text-sm transition-colors",
              selected ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {candidate.label}
            {selected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
          </button>
        );
      })}
    </div>
  );

  return (
    <Popover
      modal
      open={isOpen}
      onOpenChange={(open: boolean) => {
        // Closing applies what is drawn.
        if (!open) onUpdate?.({ range });
        setIsOpen(open);
      }}
    >
      <PopoverTrigger asChild>
        <FilterTrigger active={!!range.from} icon={CalendarDays} aria-label="Time range">
          <span className="max-w-64 truncate">{presetLabel ?? formatRange(range, locale)}</span>
        </FilterTrigger>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto max-w-[calc(100vw-2rem)] rounded-3xl p-0">
        <div className="flex max-h-[80vh] flex-wrap overflow-y-auto">
          <div className="flex w-44 shrink-0 flex-col gap-3 p-3">
            {presetGroup("time", "Recent")}
            {presetGroup("date", "Days")}
          </div>
          <div className="flex flex-col border-l border-border/60">
            <Calendar
              mode="range"
              onSelect={handleDateSelect}
              // `from` may be unset: an empty range draws no selection.
              selected={range}
              numberOfMonths={1}
              defaultMonth={range.from ?? new Date()}
              className="p-3"
            />
            {range.from && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 px-4 py-3">
                <TimeField label="From" date={range.from} onChange={(from) => setRange((prev) => ({ ...prev, from }))} />
                {range.to && (
                  <TimeField label="To" date={range.to} onChange={(to) => setRange((prev) => ({ ...prev, to }))} />
                )}
              </div>
            )}
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-full text-muted-foreground"
                disabled={!range.from}
                onClick={() => commit({ from: undefined, to: undefined })}
              >
                Clear
              </Button>
              <Button size="sm" className="h-8 rounded-full px-4" onClick={() => commit(range, pickedPreset)}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

DateTimeRangePicker.displayName = "DateTimeRangePicker";
