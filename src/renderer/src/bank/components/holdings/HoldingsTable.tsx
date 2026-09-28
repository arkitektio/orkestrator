import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/ui/table";
import { cn } from "@/core/util/utils";
import { formatMoney } from "../../format";
import { Position } from "./holdings";

const Gain = ({ value, currency, cost }: { value: number | null; currency: string; cost?: number | null }) => {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const ratio = cost && cost > 0 ? value / cost : null;
  return (
    <span className={cn("tabular-nums", value > 0 && "text-emerald-600 dark:text-emerald-400", value < 0 && "text-destructive")}>
      {formatMoney(value, currency, { signed: true })}
      {ratio != null && (
        <span className="ml-1 text-xs opacity-80">
          ({ratio > 0 ? "+" : ""}
          {(ratio * 100).toFixed(1)}%)
        </span>
      )}
    </span>
  );
};

const quantity = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 6 });

/** Depot positions, largest first: what, how many, bought at, worth now, gain, share. */
export const HoldingsTable = ({ positions }: { positions: readonly Position[] }) => {
  if (positions.length === 0) {
    return <div className="p-6 text-center text-sm text-muted-foreground">No positions on this day.</div>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Security</TableHead>
          <TableHead className="text-right">Units</TableHead>
          <TableHead className="text-right">Buy-in</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Value</TableHead>
          <TableHead className="text-right">Gain</TableHead>
          <TableHead className="w-28">Share</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {positions.map((p) => (
          <TableRow key={`${p.isin}|${p.currency}`}>
            <TableCell className="max-w-72">
              <div className="truncate font-medium">{p.name}</div>
              <div className="truncate font-mono text-[11px] text-muted-foreground">
                {p.isin}
                {p.securityType && <span className="ml-2 font-sans">{p.securityType.toLowerCase()}</span>}
              </div>
            </TableCell>
            <TableCell className="text-right tabular-nums">{quantity(p.quantity)}</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {p.fifoPrice != null ? formatMoney(p.fifoPrice, p.currency) : "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {p.price != null ? formatMoney(p.price, p.currency) : "—"}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">{formatMoney(p.valuation, p.currency)}</TableCell>
            <TableCell className="text-right">
              <Gain value={p.gain} currency={p.currency} cost={p.gain != null ? p.valuation - p.gain : null} />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-[var(--chart-2)]" style={{ width: `${p.weight * 100}%` }} />
                </div>
                <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                  {(p.weight * 100).toFixed(1)}%
                </span>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export { Gain };
