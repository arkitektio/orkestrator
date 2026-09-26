import { Card } from "@/core/ui/card";
import { cn } from "@/core/util/utils";
import { BankTransaction } from "@/bank/linkers";
import { ArrowLeftRight, Clock } from "lucide-react";
import React from "react";
import { ListTransactionFragment, TransactionStatus } from "../../api/graphql";
import { formatShortDay } from "../../format";
import { CategoryBadge } from "../CategoryBadge";
import { TradeBadge, tradeLine } from "../TradeBadge";
import { Money } from "../Money";

/**
 * One statement line: who, what for, how much. Pending lines are dimmed and
 * transfers between own accounts are marked, since both are left out of stats.
 */
const TransactionCard = ({ item }: { item: ListTransactionFragment }) => {
  const pending = item.status === TransactionStatus.Pending;
  return (
    <BankTransaction.Smart object={item}>
      <Card className={cn("group px-3 py-2 flex flex-col gap-1", pending && "opacity-70")}>
        <div className="flex items-baseline justify-between gap-3">
          <BankTransaction.DetailLink object={item} className="min-w-0 truncate text-sm font-medium">
            {item.counterparty || item.remittance || "Unknown"}
          </BankTransaction.DetailLink>
          <Money amount={item.amount} currency={item.currency} signed className="text-sm font-medium" />
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="flex min-w-0 items-center gap-2">
            <span className="shrink-0">{formatShortDay(item.bookingDate ?? item.transactionDate)}</span>
            {pending && <Clock className="h-3 w-3 shrink-0" aria-label="Pending" />}
            {item.isTransfer && <ArrowLeftRight className="h-3 w-3 shrink-0" aria-label="Transfer" />}
            <TradeBadge kind={item.kind} className="shrink-0" />
            {item.isin ? (
              <span className="truncate font-mono">{tradeLine(item.quantity, item.isin)}</span>
            ) : (
              item.remittance && item.counterparty && <span className="truncate">{item.remittance}</span>
            )}
          </span>
          {item.category ? (
            <CategoryBadge category={item.category} className="shrink-0" />
          ) : (
            !item.isTransfer && !item.kind && <span className="shrink-0 italic">Uncategorized</span>
          )}
        </div>
      </Card>
    </BankTransaction.Smart>
  );
};

export default React.memo(TransactionCard);
