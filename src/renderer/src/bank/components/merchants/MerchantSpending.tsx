import { cn } from "@/core/util/utils";
import { BankMerchant } from "@/bank/linkers";
import { Link } from "react-router-dom";
import { MerchantTotalFragment } from "../../api/graphql";
import { formatMoney, toNumber } from "../../format";
import { dominantCurrency } from "../charts/currency";
import { MerchantLogo } from "../MerchantLogo";

/**
 * Where the money went by merchant, largest first, as bars against the
 * largest. Lines without a merchant are one row that leads to Discover.
 */
export const MerchantSpending = ({
  totals,
  limit,
  className,
}: {
  totals: readonly MerchantTotalFragment[];
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
        <div key={row.merchant?.id ?? "none"} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            {row.merchant ? (
              <BankMerchant.DetailLink object={row.merchant} className="flex min-w-0 items-center gap-2">
                <MerchantLogo merchant={row.merchant} className="h-5 w-5" />
                <span className="truncate">{row.merchant.name}</span>
              </BankMerchant.DetailLink>
            ) : (
              <Link to="/bank/merchants/discover" className="text-xs italic text-muted-foreground hover:underline">
                Not recognized yet — discover merchants
              </Link>
            )}
            <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
              {row.count}× · <span className="text-foreground">{formatMoney(row.expense, currency)}</span>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-muted-foreground"
              style={{
                width: `${(toNumber(row.expense) / max) * 100}%`,
                ...(row.merchant?.category?.color ? { backgroundColor: row.merchant.category.color } : {}),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
