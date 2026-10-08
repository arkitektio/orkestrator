import { Badge } from "@/core/ui/badge";
import { Calendar } from "@/core/ui/calendar";
import { Input } from "@/core/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { cn } from "@/core/util/utils";
import {
  CRON_PRESETS,
  CadenceDraft,
  IntervalUnit,
  SimpleCadence,
  UNIT_SECONDS,
  cadenceToInput,
  cronFiresOnDay,
  cronFromSimple,
  describeCron,
  describeInterval,
  isValidTimeZone,
  nextCronFires,
  parseCron,
  simpleFromCron,
} from "@/rekuest/lib/cron";
import { useMemo, useState } from "react";

type Tab = SimpleCadence["kind"] | "every" | "custom";

const TABS: { value: Tab; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "every", label: "Every …" },
  { value: "custom", label: "Custom" },
];

// Monday first, as the calendar below reads.
const WEEKDAY_CHIPS: { value: number; label: string }[] = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const TIME_ZONES: string[] = (() => {
  try {
    return (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
      .supportedValuesOf?.("timeZone") ?? [];
  } catch {
    return [];
  }
})();

const fireFormat = (timeZone: string) =>
  new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const pad = (n: number) => String(n).padStart(2, "0");

const tabOf = (draft: CadenceDraft): Tab =>
  draft.mode === "interval" ? "every" : (simpleFromCron(draft.cron)?.kind ?? "custom");

/** Toggle a member, but never empty the list: a cadence needs one day. */
const toggled = (values: number[], value: number) => {
  const next = values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
  return next.length > 0 ? next : values;
};

const PanelLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-xs font-medium text-muted-foreground">{children}</span>
);

/**
 * When a schedule runs, as the panel beside its form: pick a rhythm and a
 * time, see the days it lands on in a month and the next runs. The simple
 * rhythms only write the cron line (`simpleFromCron` / `cronFromSimple`);
 * "Custom" edits the line itself.
 */
export const SchedulePanel = ({
  value,
  onChange,
  className,
}: {
  value: CadenceDraft;
  onChange: (value: CadenceDraft) => void;
  className?: string;
}) => {
  const [tab, setTab] = useState<Tab>(() => tabOf(value));
  const [month, setMonth] = useState(() => new Date());
  const set = (patch: Partial<CadenceDraft>) => onChange({ ...value, ...patch });

  const simple = useMemo(() => simpleFromCron(value.cron), [value.cron]);
  const hour = simple?.hour ?? 9;
  const minute = simple?.minute ?? 0;
  const setSimple = (next: SimpleCadence) => set({ mode: "cron", cron: cronFromSimple(next) });

  const pickTab = (next: Tab) => {
    setTab(next);
    if (next === "every") return set({ mode: "interval" });
    if (next === "custom") return set({ mode: "cron" });
    if (next === "daily") return setSimple({ kind: "daily", hour, minute });
    if (next === "weekly") {
      const weekdays = simple?.kind === "weekly" ? simple.weekdays : [1, 2, 3, 4, 5];
      return setSimple({ kind: "weekly", hour, minute, weekdays });
    }
    const days = simple?.kind === "monthly" ? simple.days : [1];
    return setSimple({ kind: "monthly", hour, minute, days });
  };

  const parsed = useMemo(
    () => (value.mode === "cron" ? parseCron(value.cron) : null),
    [value.mode, value.cron],
  );
  const cron = parsed?.ok ? parsed.cron : null;

  const preview = useMemo(() => {
    const checked = cadenceToInput(value);
    if (!checked.ok) return { error: checked.error };
    if (value.mode === "interval" || !cron) {
      return { words: describeInterval(value.every * UNIT_SECONDS[value.unit]), fires: [] };
    }
    const format = fireFormat(value.timezone);
    return {
      words: describeCron(cron),
      fires: nextCronFires(cron, value.timezone, new Date(), 5).map((date) => format.format(date)),
    };
  }, [value, cron]);

  const onDayClick = (date: Date) => {
    if (simple?.kind === "weekly" && tab === "weekly") {
      setSimple({ ...simple, weekdays: toggled(simple.weekdays, date.getDay()) });
    }
    if (simple?.kind === "monthly" && tab === "monthly") {
      setSimple({ ...simple, days: toggled(simple.days, date.getDate()) });
    }
  };
  const dayPicks = tab === "weekly" || tab === "monthly";

  return (
    <div className={cn("flex flex-col gap-4 rounded-lg border bg-muted/30 p-4", className)}>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={tab}
        onValueChange={(next) => next && pickTab(next as Tab)}
        className="w-full"
      >
        {TABS.map((t) => (
          <ToggleGroupItem key={t.value} value={t.value} className="flex-1 px-1 text-xs">
            {t.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {simple && tab === simple.kind && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <PanelLabel>At</PanelLabel>
            <Input
              type="time"
              className="h-8 w-28 text-center font-mono"
              value={`${pad(simple.hour)}:${pad(simple.minute)}`}
              onChange={(e) => {
                const [h, m] = e.target.value.split(":").map(Number);
                if (Number.isInteger(h) && Number.isInteger(m)) {
                  setSimple({ ...simple, hour: h, minute: m });
                }
              }}
            />
          </div>
          {simple.kind === "weekly" && (
            <div className="flex gap-1">
              {WEEKDAY_CHIPS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  aria-pressed={simple.weekdays.includes(day.value)}
                  onClick={() =>
                    setSimple({ ...simple, weekdays: toggled(simple.weekdays, day.value) })
                  }
                  className={cn(
                    "h-7 flex-1 rounded-md border text-xs transition-colors",
                    simple.weekdays.includes(day.value)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
          )}
          {simple.kind === "monthly" && (
            <p className="text-xs text-muted-foreground">
              Pick the days in the calendar.
              {simple.days.some((day) => day > 28) && " A month without that day is skipped."}
            </p>
          )}
        </div>
      )}

      {tab === "every" && (
        <div className="flex items-center gap-2">
          <PanelLabel>Every</PanelLabel>
          <Input
            type="number"
            min={1}
            className="h-8 w-20"
            value={Number.isNaN(value.every) ? "" : value.every}
            onChange={(e) => set({ every: e.target.valueAsNumber })}
          />
          <Select value={value.unit} onValueChange={(unit) => set({ unit: unit as IntervalUnit })}>
            <SelectTrigger className="h-8 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">minutes</SelectItem>
              <SelectItem value="hours">hours</SelectItem>
              <SelectItem value="days">days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {tab === "custom" && (
        <div className="flex flex-col gap-2">
          <Input
            className="h-8 font-mono"
            value={value.cron}
            placeholder="minute hour day month weekday"
            spellCheck={false}
            onChange={(e) => set({ cron: e.target.value })}
          />
          <div className="flex flex-wrap gap-1.5">
            {CRON_PRESETS.map((preset) => (
              <Badge
                key={preset.cron}
                variant={value.cron === preset.cron ? "default" : "outline"}
                className="cursor-pointer select-none"
                onClick={() => set({ cron: preset.cron })}
              >
                {preset.label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {tab !== "every" && (
        <Calendar
          month={month}
          onMonthChange={setMonth}
          weekStartsOn={1}
          onDayClick={dayPicks ? onDayClick : undefined}
          modifiers={{ fires: (date) => !!cron && cronFiresOnDay(cron, date) }}
          modifiersClassNames={{
            fires: "[&>button]:bg-primary/20 [&>button]:font-medium [&>button]:text-foreground",
          }}
          className={cn(
            "w-full self-center bg-transparent p-0 [--cell-size:--spacing(8)]",
            !dayPicks && "[&_td>button]:cursor-default",
          )}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <PanelLabel>Time zone</PanelLabel>
        <Input
          className="h-8 w-48"
          value={value.timezone}
          list="rekuest-time-zones"
          aria-invalid={!isValidTimeZone(value.timezone)}
          title="The time zone the times are read in"
          onChange={(e) => set({ timezone: e.target.value })}
        />
        <datalist id="rekuest-time-zones">
          {TIME_ZONES.map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>
      </div>

      <div className="border-t pt-3 text-xs">
        {"error" in preview ? (
          <span className="text-destructive">{preview.error}</span>
        ) : (
          <>
            <p className="text-sm font-medium text-foreground">{preview.words}</p>
            {preview.fires.length > 0 && (
              <ol className="mt-2 flex flex-col gap-1 text-muted-foreground">
                {preview.fires.map((fire, index) => (
                  <li key={fire} className={cn("tabular-nums", index === 0 && "text-foreground")}>
                    {index === 0 ? "Next " : ""}
                    {fire}
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </div>
  );
};
