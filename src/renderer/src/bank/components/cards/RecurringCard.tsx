import { Badge } from "@/core/ui/badge";
import { Card } from "@/core/ui/card";
import { cn } from "@/core/util/utils";
import { BankRecurring } from "@/bank/linkers";
import React from "react";
import { ListRecurringPaymentFragment, RecurringStatus } from "../../api/graphql";
import { formatShortDay, intervalLabel } from "../../format";
import { Money } from "../Money";

const RecurringCard = ({ item }: { item: ListRecurringPaymentFragment }) => (
  <BankRecurring.Smart object={item}>
    <Card className={cn("group p-3 flex flex-col gap-1", item.status === RecurringStatus.Ignored && "opacity-60")}>
      <div className="flex items-baseline justify-between gap-3">
        <BankRecurring.DetailLink object={item} className="min-w-0 truncate font-medium">
          {item.label}
        </BankRecurring.DetailLink>
        <Money amount={item.amount} currency={item.currency} signed className="text-sm font-medium" />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">
          {intervalLabel(item.intervalDays)} · next {formatShortDay(item.nextExpected)}
        </span>
        {item.status === RecurringStatus.Detected && (
          <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">
            detected
          </Badge>
        )}
      </div>
    </Card>
  </BankRecurring.Smart>
);

export default React.memo(RecurringCard);
