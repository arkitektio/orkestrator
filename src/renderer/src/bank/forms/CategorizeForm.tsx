import { useDialog } from "@/core/dialogs/registry";
import { GraphQLSearchField } from "@/core/forms/GraphQLSearchField";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCategorizeTransactionsMutation, useSearchCategoriesLazyQuery } from "../api/graphql";
import { toastText } from "../errors";

/**
 * Set (or clear) the category of one or more transactions. Setting it by hand
 * pins it: rules will not change it again.
 */
export const CategorizeForm = (props: { ids: string[]; category?: string | null }) => {
  const [categorize] = useCategorizeTransactionsMutation();
  const [searchCategories] = useSearchCategoriesLazyQuery();
  const { closeDialog } = useDialog();
  const [busy, setBusy] = useState(false);
  const form = useForm<{ category: string | null }>({ defaultValues: { category: props.category ?? null } });

  const apply = async (category: string | null) => {
    setBusy(true);
    try {
      await categorize({ variables: { ids: props.ids, category } });
      toast.success(category ? "Categorized" : "Category cleared");
      closeDialog();
    } catch (e) {
      toast.error("Could not categorize: " + toastText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => apply(data.category || null))} className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>
            Categorize {props.ids.length === 1 ? "transaction" : `${props.ids.length} transactions`}
          </DialogTitle>
          <DialogDescription>A category set by hand is never overridden by rules.</DialogDescription>
        </DialogHeader>
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
