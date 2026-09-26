import { createList } from "@/core/layout/createList";
import { BankRule } from "@/bank/linkers";
import { useListCategoryRulesQuery } from "../../api/graphql";
import RuleCard from "../cards/RuleCard";

const RuleList = createList({
  useHook: useListCategoryRulesQuery,
  dataKey: "categoryRules",
  ItemComponent: RuleCard,
  title: "Rules",
  emptyTitle: "No rules",
  smart: BankRule,
  minItemWidth: 280,
});

export default RuleList;
