import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { FloatField } from "@/core/forms/FloatField";
import { GraphQLSearchField } from "@/core/forms/GraphQLSearchField";
import { StringField } from "@/core/forms/StringField";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import {
  BudgetStatusDocument,
  ListBudgetsDocument,
  useCreateBudgetMutation,
  useSearchCategoriesLazyQuery,
} from "../api/graphql";
import { decimalOrNull } from "./options";

type Values = { category: string | null; amount: number | null; currency: string };

/** A monthly limit for a category (and its children), from this month on. */
export const CreateBudgetForm = (props: { category?: string; currency?: string }) => {
  const [create, { loading }] = useCreateBudgetMutation({
    refetchQueries: [ListBudgetsDocument, BudgetStatusDocument],
  });
  const [searchCategories] = useSearchCategoriesLazyQuery();
  const submit = useGraphQLDialog(create, { successMessage: "Budget created" });

  const form = useForm<Values>({
    defaultValues: { category: props.category ?? null, amount: null, currency: props.currency ?? "EUR" },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => {
          const amount = decimalOrNull(data.amount);
          if (!data.category) {
            form.setError("category", { message: "Pick a category to budget." });
            return;
          }
          if (!amount || Number(amount) <= 0) {
            form.setError("amount", { message: "A budget is a positive amount." });
            return;
          }
          return submit({
            variables: { input: { category: data.category, amount, currency: data.currency.toUpperCase() } },
          });
        })}
        className="flex flex-col gap-4"
      >
        <DialogHeader>
          <DialogTitle>New budget</DialogTitle>
          <DialogDescription>
            A monthly limit. Spending in child categories counts towards it; only transactions in its
            currency do.
          </DialogDescription>
        </DialogHeader>
        <GraphQLSearchField name="category" label="Category" searchQuery={searchCategories} />
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <FloatField name="amount" label="Per month" placeholder="400" />
          <StringField name="currency" label="Currency" />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create budget"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
