import { Card } from "@/core/ui/card";
import { cn } from "@/core/util/utils";
import { BankRule } from "@/bank/linkers";
import React from "react";
import { CategoryRuleFragment, RuleDirection } from "../../api/graphql";
import { CategoryBadge } from "../CategoryBadge";

/** A rule, read as a sentence: "counterparty contains 'billa' → Groceries". */
export const ruleSentence = (rule: CategoryRuleFragment) => {
  const direction =
    rule.direction === RuleDirection.In ? "money in, " : rule.direction === RuleDirection.Out ? "money out, " : "";
  return `${direction}${rule.field.toLowerCase()} ${rule.match.toLowerCase()} “${rule.pattern}”`;
};

const RuleCard = ({ item }: { item: CategoryRuleFragment }) => (
  <BankRule.Smart object={item}>
    <Card className={cn("group p-3 flex flex-col gap-1", !item.active && "opacity-60")}>
      <BankRule.DetailLink object={item} className="truncate text-sm font-medium">
        {ruleSentence(item)}
      </BankRule.DetailLink>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <CategoryBadge category={item.category} />
        <span>
          #{item.priority}
          {!item.active && " · off"}
        </span>
      </div>
    </Card>
  </BankRule.Smart>
);

export default React.memo(RuleCard);
