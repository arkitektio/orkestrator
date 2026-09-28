import { Card } from "@/core/ui/card";
import { cn } from "@/core/util/utils";
import { BankTransaction } from "@/bank/linkers";
import { ArrowLeftRight, Clock } from "lucide-react";
import React from "react";
import { CategorySource, ListTransactionFragment, SuggestionChipFragment, TransactionStatus } from "../../api/graphql";
import { formatShortDay } from "../../format";
import { CategoryBadge } from "../CategoryBadge";
import { TradeBadge, tradeLine } from "../TradeBadge";
import { MerchantLogo } from "../MerchantLogo";
import { Money } from "../Money";
import { CardSuggestions } from "./CardSuggestions";

type Item = ListTransactionFragment & { suggestedCategories?: SuggestionChipFragment[] };

/**
 * One statement line: who, what for, how much. Pending lines are dimmed and
 * transfers between own accounts are marked, since both are left out of stats.
 * With suggestions loaded (a review list), a line without a settled category
 * offers them as one-click chips.
 */
const TransactionCard = ({ item }: { item: Item }) => {
  const pending = item.status === TransactionStatus.Pending;
  const unsettled =
    !item.isTransfer &&
    !item.kind &&
    (!item.category || item.categorySource === CategorySource.Semantic);
  return (
    <BankTransaction.Smart object={item}>
      <Card className={cn("group px-3 py-2 flex flex-col gap-1", pending && "opacity-70")}>
        <div className="flex items-baseline justify-between gap-3">
          <BankTransaction.DetailLink object={item} className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
            {item.merchant && <MerchantLogo merchant={item.merchant} className="h-4 w-4 rounded-sm" />}
            <span className="truncate">{item.merchant?.name || item.counterparty || item.remittance || "Unknown"}</span>
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
            <CategoryBadge
              category={item.category}
              guessed={item.categorySource === CategorySource.Semantic}
              className="shrink-0"
            />
          ) : (
            !item.isTransfer && !item.kind && <span className="shrink-0 italic">Uncategorized</span>
          )}
        </div>
        {unsettled && item.suggestedCategories && (
          <CardSuggestions
            transaction={item.id}
            source={item.categorySource}
            current={item.category?.id}
            suggestions={item.suggestedCategories}
          />
        )}
      </Card>
    </BankTransaction.Smart>
  );
};

export default React.memo(TransactionCard);
