import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { PageAction } from "@/core/ui/page-action";
import { BankCategory } from "@/bank/linkers";
import { FolderPlus, ListPlus, PiggyBank } from "lucide-react";
import { useMemo } from "react";
import { useBudgetStatusQuery, useGetCategoryQuery } from "../api/graphql";
import BudgetStatusCard from "../components/cards/BudgetStatusCard";
import CategoryCard from "../components/cards/CategoryCard";
import RuleCard from "../components/cards/RuleCard";
import { useTransactionFilterBar } from "../components/filter/TransactionFilterBar";
import { InfoList } from "../components/InfoList";
import TransactionList from "../components/lists/TransactionList";

const CategoryPage = asDetailQueryRoute(useGetCategoryQuery, ({ data }) => {
  const category = data.category;
  const { openDialog } = useDialog();
  // A parent category shows its children's transactions too, as its budget counts them.
  const base = useMemo(() => ({ categories: [category.id], includeChildCategories: true }), [category.id]);
  const { filters, ordering, actions } = useTransactionFilterBar(base);
  const { data: budgets } = useBudgetStatusQuery();
  const budget = budgets?.budgetStatus.find((status) => status.budget.category.id === category.id);

  return (
    <BankCategory.ModelPage
      title={
        <span className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full bg-muted-foreground"
            style={category.color ? { backgroundColor: category.color } : undefined}
          />
          {category.name}
        </span>
      }
      object={category}
      pageActions={
        <>
          {actions}
          <PageAction
            size="sm"
            collapse="icon"
            icon={<ListPlus className="h-4 w-4" />}
            onClick={() => openDialog("bankcreaterule", { category: category.id }, { size: "medium" })}
          >
            New rule
          </PageAction>
          {!budget && (
            <PageAction
              size="sm"
              collapse="icon"
              priority={-10}
              icon={<PiggyBank className="h-4 w-4" />}
              onClick={() => openDialog("bankcreatebudget", { category: category.id }, { size: "small" })}
            >
              Set budget
            </PageAction>
          )}
          <PageAction
            size="sm"
            collapse="icon"
            priority={-20}
            icon={<FolderPlus className="h-4 w-4" />}
            onClick={() =>
              openDialog("bankcreatecategory", { parent: category.id, kind: category.kind }, { size: "small" })
            }
          >
            Add subcategory
          </PageAction>
        </>
      }
      additionalSidebars={
        <>
          <Sidebars.Tab label="Info">
            <InfoList
              rows={[
                ["Kind", category.kind.toLowerCase()],
                ["Parent", category.parent && <BankCategory.DetailLink object={category.parent}>{category.parent.name}</BankCategory.DetailLink>],
              ]}
            />
          </Sidebars.Tab>
          {category.rules.length > 0 && (
            <Sidebars.Tab label="Rules">
              <div className="flex flex-col gap-2 p-3">
                {category.rules.map((rule) => (
                  <RuleCard key={rule.id} item={rule} />
                ))}
              </div>
            </Sidebars.Tab>
          )}
        </>
      }
      defaultSidebar="Info"
    >
      <div className="p-6 flex flex-col gap-6">
        {budget && (
          <div className="max-w-sm">
            <BudgetStatusCard item={budget} />
          </div>
        )}
        {category.children.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
            {category.children.map((child) => (
              <CategoryCard key={child.id} item={child} />
            ))}
          </div>
        )}
        <TransactionList filters={filters} ordering={ordering} defaultLimit={30} title="Transactions" />
      </div>
    </BankCategory.ModelPage>
  );
});

export default CategoryPage;
