import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/ui/dropdown-menu";
import { ActionLabel, ActionTrigger, PageAction } from "@/core/ui/page-action";
import { cn } from "@/core/util/utils";
import { CalendarRange } from "lucide-react";
import { useMemo, useState } from "react";
import { Comparison, StatsWindowInput } from "../../api/graphql";
import { firstOfMonth } from "../../format";

export type Period = "month" | "quarter" | "year" | "all";

export const PERIODS: Record<Period, { label: string; short: string; dateFrom: () => string | undefined }> = {
  month: { label: "This month", short: "Month", dateFrom: () => firstOfMonth() },
  quarter: { label: "Last 3 months", short: "3M", dateFrom: () => firstOfMonth(new Date(), 2) },
  year: { label: "Last 12 months", short: "12M", dateFrom: () => firstOfMonth(new Date(), 11) },
  all: { label: "All time", short: "All", dateFrom: () => undefined },
};

export const COMPARISONS: Record<Comparison, string> = {
  [Comparison.PreviousPeriod]: "vs. the period before",
  [Comparison.SamePeriodLastYear]: "vs. a year earlier",
  [Comparison.None]: "No comparison",
};

/** The stats window for a period (the server's `dateTo` defaults to today). */
export const windowFor = (period: Period): StatsWindowInput => {
  const dateFrom = PERIODS[period].dateFrom();
  return dateFrom ? { dateFrom } : {};
};

/** A period and its window, memoized so queries keep stable variables. */
export const usePeriod = (initial: Period = "year") => {
  const [period, setPeriod] = useState<Period>(initial);
  const window = useMemo(() => windowFor(period), [period]);
  return { period, setPeriod, window };
};

/** The period (and optionally comparison) as a page-action dropdown. */
export const PeriodPicker = ({
  period,
  onPeriod,
  compareTo,
  onCompareTo,
}: {
  period: Period;
  onPeriod: (period: Period) => void;
  compareTo?: Comparison;
  onCompareTo?: (compareTo: Comparison) => void;
}) => (
  <PageAction.Slot collapse="icon">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ActionTrigger aria-label="Period">
          <CalendarRange className="h-4 w-4" />
          <ActionLabel>{PERIODS[period].label}</ActionLabel>
        </ActionTrigger>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuRadioGroup value={period} onValueChange={(v) => onPeriod(v as Period)}>
          {(Object.keys(PERIODS) as Period[]).map((key) => (
            <DropdownMenuRadioItem key={key} value={key}>
              {PERIODS[key].label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {compareTo && onCompareTo && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Compare</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={compareTo} onValueChange={(v) => onCompareTo(v as Comparison)}>
              {(Object.keys(COMPARISONS) as Comparison[]).map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {COMPARISONS[key]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  </PageAction.Slot>
);

/** The period as a compact segmented row, for sidebar tabs. */
export const PeriodTabs = ({
  period,
  onPeriod,
  className,
}: {
  period: Period;
  onPeriod: (period: Period) => void;
  className?: string;
}) => (
  <div className={cn("flex w-fit gap-0.5 rounded-md bg-muted p-0.5 text-xs", className)}>
    {(Object.keys(PERIODS) as Period[]).map((key) => (
      <button
        key={key}
        type="button"
        title={PERIODS[key].label}
        onClick={() => onPeriod(key)}
        className={cn(
          "rounded px-2 py-0.5 text-muted-foreground hover:text-foreground",
          key === period && "bg-background text-foreground shadow-sm",
        )}
      >
        {PERIODS[key].short}
      </button>
    ))}
  </div>
);
