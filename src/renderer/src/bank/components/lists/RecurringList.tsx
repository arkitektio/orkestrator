import { createList } from "@/core/layout/createList";
import { BankRecurring } from "@/bank/linkers";
import { useListRecurringPaymentsQuery } from "../../api/graphql";
import RecurringCard from "../cards/RecurringCard";

const RecurringList = createList({
  useHook: useListRecurringPaymentsQuery,
  dataKey: "recurringPayments",
  ItemComponent: RecurringCard,
  title: "Recurring payments",
  emptyTitle: "Nothing recurring found",
  smart: BankRecurring,
  minItemWidth: 280,
});

export default RecurringList;
