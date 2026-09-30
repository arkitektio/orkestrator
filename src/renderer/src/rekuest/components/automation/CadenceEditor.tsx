import { Badge } from "@/core/ui/badge";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import {
  CRON_PRESETS,
  CadenceDraft,
  IntervalUnit,
  cadenceToInput,
  describeCron,
  describeInterval,
  isValidTimeZone,
  nextCronFires,
  parseCron,
  UNIT_SECONDS,
} from "@/rekuest/lib/cron";
import { useMemo } from "react";

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

/**
 * When a schedule runs: every N minutes/hours/days, or a cron line read in a
 * time zone. Says the line back in words and previews the next fires, so a
 * typo shows before it is saved.
 */
export const CadenceEditor = ({
  value,
  onChange,
}: {
  value: CadenceDraft;
  onChange: (value: CadenceDraft) => void;
}) => {
  const set = (patch: Partial<CadenceDraft>) => onChange({ ...value, ...patch });

  const preview = useMemo(() => {
    const checked = cadenceToInput(value);
    if (!checked.ok) return { error: checked.error };
    if (value.mode === "interval") {
      return { words: describeInterval(value.every * UNIT_SECONDS[value.unit]) };
    }
    const parsed = parseCron(value.cron);
    if (!parsed.ok) return { error: parsed.error };
    const fires = nextCronFires(parsed.cron, value.timezone, new Date(), 3);
    const format = fireFormat(value.timezone);
    return {
      words: describeCron(parsed.cron),
      fires: fires.map((date) => format.format(date)),
    };
  }, [value]);

  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={value.mode}
        onValueChange={(mode) => mode && set({ mode: mode as CadenceDraft["mode"] })}
        className="self-start"
      >
        <ToggleGroupItem value="cron">On a calendar</ToggleGroupItem>
        <ToggleGroupItem value="interval">Every …</ToggleGroupItem>
      </ToggleGroup>

      {value.mode === "interval" ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Every</span>
          <Input
            type="number"
            min={1}
            className="h-8 w-20"
            value={Number.isNaN(value.every) ? "" : value.every}
            onChange={(e) => set({ every: e.target.valueAsNumber })}
          />
          <Select value={value.unit} onValueChange={(unit) => set({ unit: unit as IntervalUnit })}>
            <SelectTrigger className="h-8 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">minutes</SelectItem>
              <SelectItem value="hours">hours</SelectItem>
              <SelectItem value="days">days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
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
          <div className="flex items-center gap-2">
            <Input
              className="h-8 flex-1 font-mono"
              value={value.cron}
              placeholder="minute hour day month weekday"
              spellCheck={false}
              onChange={(e) => set({ cron: e.target.value })}
            />
            <Input
              className="h-8 w-48"
              value={value.timezone}
              list="rekuest-time-zones"
              aria-invalid={!isValidTimeZone(value.timezone)}
              title="The time zone the line is read in"
              onChange={(e) => set({ timezone: e.target.value })}
            />
            <datalist id="rekuest-time-zones">
              {TIME_ZONES.map((zone) => (
                <option key={zone} value={zone} />
              ))}
            </datalist>
          </div>
        </div>
      )}

      <div className="text-xs">
        {"error" in preview ? (
          <span className="text-destructive">{preview.error}</span>
        ) : (
          <span className="text-muted-foreground">
            <span className="text-foreground">{preview.words}</span>
            {preview.fires && preview.fires.length > 0 && (
              <> · next {preview.fires.join(", ")}</>
            )}
          </span>
        )}
      </div>
    </div>
  );
};

export const FieldBlock = ({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <Label className="text-sm font-medium">{label}</Label>
    {description && <p className="-mt-1 text-xs text-muted-foreground">{description}</p>}
    {children}
  </div>
);
