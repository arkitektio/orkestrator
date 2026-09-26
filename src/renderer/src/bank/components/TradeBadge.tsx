import { Badge } from "@/core/ui/badge";
import { cn } from "@/core/util/utils";
import { TransactionKind } from "../api/graphql";
import { toNumber } from "../format";
import { groupOfKind, KIND_GROUPS, kindLabel } from "./kinds";

/** A broker transaction's kind (buy, distribution, fee, …), coloured by its group. Bank transactions have none. */
export const TradeBadge = ({ kind, className }: { kind?: TransactionKind | null; className?: string }) => {
  if (!kind) return null;
  const group = groupOfKind(kind);
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full px-1.5 py-0 text-[10px] font-medium",
        group ? KIND_GROUPS[group].tone : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {kindLabel(kind)}
    </Badge>
  );
};

/** "3.5 × IE00B4L5Y983" for a trade, or null. */
export const tradeLine = (quantity?: string | null, isin?: string | null) =>
  quantity && isin
    ? `${toNumber(quantity).toLocaleString(undefined, { maximumFractionDigits: 6 })} × ${isin}`
    : isin ?? null;
