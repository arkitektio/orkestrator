import { Card } from "@/core/ui/card";
import { Progress } from "@/core/ui/progress";
import { cn } from "@/core/util/utils";
import { BankBudget } from "@/bank/linkers";
import React from "react";
import { BudgetStatusFragment } from "../../api/graphql";
import { formatMoney, toNumber } from "../../format";
import { CategoryBadge } from "../CategoryBadge";

/** A budget in one month: how much of it is gone. */
const BudgetStatusCard = ({ item }: { item: BudgetStatusFragment }) => {
  const over = toNumber(item.remaining) < 0;
  const currency = item.budget.currency;
  return (
    <BankBudget.Smart object={item.budget}>
      <Card className="group p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <CategoryBadge category={item.budget.category} className="text-sm font-medium" />
          <BankBudget.DetailLink object={item.budget} className="text-xs text-muted-foreground tabular-nums">
            {formatMoney(item.spent, currency)} / {formatMoney(item.budgeted, currency)}
          </BankBudget.DetailLink>
        </div>
        <Progress
          value={Math.min(100, item.ratio * 100)}
          className={cn("h-1.5", over && "[&>*]:bg-destructive")}
        />
        <div className={cn("text-xs", over ? "text-destructive" : "text-muted-foreground")}>
          {over
            ? `${formatMoney(item.remaining, currency, { absolute: true })} over`
            : `${formatMoney(item.remaining, currency)} left`}
        </div>
      </Card>
    </BankBudget.Smart>
  );
};

export default React.memo(BudgetStatusCard);
