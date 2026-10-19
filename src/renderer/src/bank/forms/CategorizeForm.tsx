import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { GraphQLSearchField } from "@/core/forms/GraphQLSearchField";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import { useCategorizeTransactionsMutation, useSearchCategoriesLazyQuery } from "../api/graphql";
import { CategorySuggestions } from "../components/CategorySuggestions";
import { asBankError } from "../errors";

/**
 * Set (or clear) the category of one or more transactions. Setting it by hand
 * pins it: rules will not change it again.
 */
export const CategorizeForm = (props: { ids: string[]; category?: string | null }) => {
  const [categorize] = useCategorizeTransactionsMutation();
  const [searchCategories] = useSearchCategoriesLazyQuery();
  const form = useForm<{ category: string | null }>({ defaultValues: { category: props.category ?? null } });

  // The transactions show their category where the dialog was opened from.
  const { submit: apply, submitting: busy } = useDialogSubmit(
    (category: string | null) =>
      categorize({ variables: { ids: props.ids, category } }).catch((e) => Promise.reject(asBankError(e))),
    { errorTitle: "Couldn't categorize" },
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => apply(data.category || null))} className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>
            Categorize {props.ids.length === 1 ? "transaction" : `${props.ids.length} transactions`}
          </DialogTitle>
          <DialogDescription>A category set by hand is never overridden by rules.</DialogDescription>
        </DialogHeader>
        {props.ids.length === 1 && (
          <CategorySuggestions transaction={props.ids[0]} exclude={props.category} onPick={apply} disabled={busy} />
        )}
        <GraphQLSearchField name="category" label="Category" searchQuery={searchCategories} />
        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" disabled={busy} onClick={() => apply(null)}>
            Clear, let rules decide
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
