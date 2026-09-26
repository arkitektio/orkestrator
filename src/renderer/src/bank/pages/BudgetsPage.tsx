import { PageAction } from "@/core/ui/page-action";
import { DialogButton } from "@/core/ui/dialog-button";
import { BankBudget } from "@/bank/linkers";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useBudgetStatusQuery } from "../api/graphql";
import BudgetStatusCard from "../components/cards/BudgetStatusCard";
import { firstOfMonth, formatMonth } from "../format";

/** This month's budgets, spent against limit; step back through earlier months. */
const BudgetsPage = () => {
  const [monthsBack, setMonthsBack] = useState(0);
  const month = firstOfMonth(new Date(), monthsBack);
  const { data } = useBudgetStatusQuery({ variables: { month } });
  const statuses = data?.budgetStatus ?? [];

  return (
    <BankBudget.ListPage
      title={`Budgets · ${formatMonth(month, true)}`}
      pageActions={
        <>
          <PageAction size="sm" collapse="icon" icon={<ChevronLeft className="h-4 w-4" />} onClick={() => setMonthsBack((m) => m + 1)}>
            Earlier
          </PageAction>
          <PageAction
            size="sm"
            collapse="icon"
            icon={<ChevronRight className="h-4 w-4" />}
            disabled={monthsBack === 0}
            onClick={() => setMonthsBack((m) => Math.max(0, m - 1))}
          >
            Later
          </PageAction>
          <DialogButton name="bankcreatebudget" size="sm" variant="outline" dialogProps={{}} options={{ size: "small" }}>
            New budget
          </DialogButton>
        </>
      }
    >
      <div className="p-3">
        {data && statuses.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No budget applies to this month. Set one on any category.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {statuses.map((status) => (
              <BudgetStatusCard key={status.budget.id} item={status} />
            ))}
          </div>
        )}
      </div>
    </BankBudget.ListPage>
  );
};

export default BudgetsPage;
