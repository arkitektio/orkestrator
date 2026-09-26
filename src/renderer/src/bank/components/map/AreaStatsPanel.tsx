import { BankCategory, BankMerchant } from "@/bank/linkers";
import { useMemo } from "react";
import { useAreaInsightsQuery } from "../../api/graphql";
import { firstOfMonth, formatMoney, toNumber } from "../../format";
import { dominantCurrency } from "../charts/currency";
import { MerchantLogo } from "../MerchantLogo";
import { Viewport } from "./viewport";

const Row = ({ label, amount, share }: { label: React.ReactNode; amount: string; share: number }) => (
  <div className="flex items-center justify-between gap-3 py-0.5">
    <span className="min-w-0 truncate">{label}</span>
    <span className="shrink-0 tabular-nums text-white/70">
      {(share * 100).toFixed(0)}% · <span className="text-white">{amount}</span>
    </span>
  </div>
);

/**
 * What was spent at the places in view over the last 12 months: the total and
 * the top merchants and categories, as a glass panel docked bottom-left (the
 * HUD's look). Follows the viewport; renders nothing where nothing was spent.
 */
export const AreaStatsPanel = ({ viewport }: { viewport: Viewport }) => {
  const window = useMemo(() => ({ dateFrom: firstOfMonth(new Date(), 11) }), []);
  const { data, previousData } = useAreaInsightsQuery({
    variables: { area: { within: viewport.bounds }, window, limit: 5 },
  });
  const insights = (data ?? previousData)?.areaInsights;
  const currency = dominantCurrency(insights?.totals ?? []);
  const total = insights?.totals.find((row) => row.currency === currency);
  if (!insights || !total || toNumber(total.expense) <= 0) return null;

  const merchants = insights.merchants.filter((row) => row.currency === currency && toNumber(row.expense) > 0).slice(0, 5);
  const categories = insights.categories
    .filter((row) => row.currency === currency && toNumber(row.expense) > 0)
    .slice(0, 5);

  return (
    <div
      className="pointer-events-auto absolute bottom-9 left-2 z-10 flex max-h-[60%] w-72 max-w-[calc(100%-1rem)] flex-col gap-2 overflow-y-auto rounded-lg border border-black/10 bg-black/40 p-3 text-xs text-white backdrop-blur-md"
      onWheel={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-white/60">In view · 12 months</span>
        <span className="text-white/60">{total.count}×</span>
      </div>
      <div className="text-lg font-semibold tabular-nums">{formatMoney(total.expense, total.currency)}</div>
      {merchants.length > 0 && (
        <div className="flex flex-col">
          <span className="text-[10px] font-medium uppercase tracking-wide text-white/60">Merchants</span>
          {merchants.map((row) => (
            <Row
              key={row.merchant?.id ?? "none"}
              share={row.share}
              amount={formatMoney(row.expense, row.currency)}
              label={
                row.merchant ? (
                  <BankMerchant.DetailLink object={row.merchant} className="flex min-w-0 items-center gap-1.5 hover:underline">
                    <MerchantLogo merchant={row.merchant} className="h-4 w-4 rounded-sm" />
                    <span className="truncate">{row.merchant.name}</span>
                  </BankMerchant.DetailLink>
                ) : (
                  <span className="italic text-white/60">No merchant</span>
                )
              }
            />
          ))}
        </div>
      )}
      {categories.length > 0 && (
        <div className="flex flex-col">
          <span className="text-[10px] font-medium uppercase tracking-wide text-white/60">Categories</span>
          {categories.map((row) => (
            <Row
              key={row.category?.id ?? "none"}
              share={row.share}
              amount={formatMoney(row.expense, row.currency)}
              label={
                row.category ? (
                  <BankCategory.DetailLink object={row.category} className="flex min-w-0 items-center gap-1.5 hover:underline">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-white/60"
                      style={row.category.color ? { backgroundColor: row.category.color } : undefined}
                    />
                    <span className="truncate">{row.category.name}</span>
                  </BankCategory.DetailLink>
                ) : (
                  <span className="italic text-white/60">Uncategorized</span>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};
