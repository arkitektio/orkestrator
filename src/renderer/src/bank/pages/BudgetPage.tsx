import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { BankBudget } from "@/bank/linkers";
import { useMemo } from "react";
import { useBudgetStatusQuery, useGetBudgetQuery } from "../api/graphql";
import BudgetStatusCard from "../components/cards/BudgetStatusCard";
import { CategoryBadge } from "../components/CategoryBadge";
import { useTransactionFilterBar } from "../components/filter/TransactionFilterBar";
import { InfoList } from "../components/InfoList";
import TransactionList from "../components/lists/TransactionList";
import { firstOfMonth, formatMoney, formatMonth, isoDay } from "../format";

const BudgetPage = asDetailQueryRoute(useGetBudgetQuery, ({ data }) => {
  const budget = data.budget;
  const { data: status } = useBudgetStatusQuery();
  const current = status?.budgetStatus.find((s) => s.budget.id === budget.id);
  // This month's spending that counts towards it.
  const base = useMemo(
    () => ({ categories: [budget.category.id], includeChildCategories: true, dateFrom: firstOfMonth(), dateTo: isoDay(new Date()) }),
    [budget.category.id],
  );
  const { filters, ordering, actions } = useTransactionFilterBar(base);

  return (
    <BankBudget.ModelPage title={`Budget · ${budget.category.name}`} object={budget} pageActions={actions}>
      <div className="p-6 flex flex-col gap-6">
        <div className="flex flex-wrap gap-6">
          {current && (
            <div className="w-72">
              <BudgetStatusCard item={current} />
            </div>
          )}
          <InfoList
            rows={[
              ["Category", <CategoryBadge category={budget.category} />],
              ["Per month", formatMoney(budget.amount, budget.currency)],
              ["From", formatMonth(budget.startMonth, true)],
              ["Until", budget.endMonth ? formatMonth(budget.endMonth, true) : "open-ended"],
            ]}
          />
        </div>
        <TransactionList filters={filters} ordering={ordering} defaultLimit={30} title="This month" />
      </div>
    </BankBudget.ModelPage>
  );
});

export default BudgetPage;
