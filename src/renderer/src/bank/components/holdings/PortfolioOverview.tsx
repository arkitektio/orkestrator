import { cn } from "@/core/util/utils";
import { useMemo } from "react";
import { formatMoney } from "../../format";
import { allocationByType, HoldingLike, aggregatePositions, summarize } from "./holdings";
import { Gain, HoldingsTable } from "./HoldingsTable";

const TYPE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

/** Value per security type as one stacked bar with a legend. */
const Allocation = ({ rows, currency }: { rows: ReturnType<typeof allocationByType>; currency: string }) => {
  if (rows.length < 2) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-2 w-full overflow-hidden rounded-full">
        {rows.map((row, i) => (
          <div key={row.type} style={{ width: `${row.weight * 100}%`, backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length] }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {rows.map((row, i) => (
          <span key={row.type} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length] }} />
            {row.type.toLowerCase()}
            <span className="tabular-nums text-muted-foreground">
              {(row.weight * 100).toFixed(0)}% · {formatMoney(row.valuation, currency)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

/**
 * Depot holdings as a whole: value and unrealized gain per currency, the split
 * by security type, and every position.
 */
export const PortfolioOverview = ({
  holdings,
  className,
}: {
  holdings: readonly HoldingLike[];
  className?: string;
}) => {
  const positions = useMemo(() => aggregatePositions(holdings), [holdings]);
  const summaries = useMemo(() => summarize(positions), [positions]);

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {summaries.map((summary) => (
        <div key={summary.currency} className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-x-10 gap-y-2">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">
                Market value{summaries.length > 1 && ` (${summary.currency})`}
              </span>
              <span className="text-3xl font-semibold tabular-nums">
                {formatMoney(summary.valuation, summary.currency)}
              </span>
            </div>
            {summary.gain != null && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Unrealized gain</span>
                <span className="text-3xl font-semibold">
                  <Gain
                    value={summary.gain}
                    currency={summary.currency}
                    cost={summary.gainRatio != null ? summary.gain / summary.gainRatio : null}
                  />
                </span>
              </div>
            )}
          </div>
          <Allocation rows={allocationByType(positions, summary.currency)} currency={summary.currency} />
        </div>
      ))}
      <HoldingsTable positions={positions} />
    </div>
  );
};
