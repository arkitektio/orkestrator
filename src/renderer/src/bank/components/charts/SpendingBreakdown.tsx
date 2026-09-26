import { cn } from "@/core/util/utils";
import { CategoryTotalFragment } from "../../api/graphql";
import { formatMoney, toNumber } from "../../format";
import { CategoryBadge } from "../CategoryBadge";
import { dominantCurrency } from "./currency";

/**
 * Where the money went, largest first, as bars against the largest category.
 * Rows rather than a pie: category names stay readable and amounts line up.
 */
export const SpendingBreakdown = ({
  totals,
  limit = 8,
  className,
}: {
  totals: readonly CategoryTotalFragment[];
  limit?: number;
  className?: string;
}) => {
  const currency = dominantCurrency(totals);
  const rows = totals
    .filter((total) => total.currency === currency && toNumber(total.expense) > 0)
    .sort((a, b) => toNumber(b.expense) - toNumber(a.expense))
    .slice(0, limit);
  if (!currency || rows.length === 0) return null;
  const max = toNumber(rows[0].expense);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {rows.map((row) => (
        <div key={row.category?.id ?? "none"} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            {row.category ? (
              <CategoryBadge category={row.category} className="text-sm" />
            ) : (
              <span className="text-xs italic text-muted-foreground">Uncategorized</span>
            )}
            <span className="tabular-nums text-xs">{formatMoney(row.expense, currency)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-muted-foreground"
              style={{
                width: `${(toNumber(row.expense) / max) * 100}%`,
                ...(row.category?.color ? { backgroundColor: row.category.color } : {}),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
