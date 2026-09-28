import { useDialog } from "@/core/dialogs/registry";
import { GraphQLSearchField } from "@/core/forms/GraphQLSearchField";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "@/core/notify";
import {
  CategoryDeletionFragment,
  ListCategoriesDocument,
  useDeleteCategoryMutation,
  useRestoreBaseCategoryMutation,
  useSearchCategoriesLazyQuery,
} from "../api/graphql";
import { toastText } from "../errors";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Delete a category after showing what goes with it (a dry run): its
 * subcategories, rules and budgets are deleted, its transactions are moved to
 * `reassignTo` or handed back to rules and suggestions. A deleted base
 * category can be restored from the toast.
 */
export const DeleteCategoryForm = (props: { id: string; name?: string }) => {
  const { closeDialog } = useDialog();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchCategories] = useSearchCategoriesLazyQuery();
  const [preview, setPreview] = useState<CategoryDeletionFragment | null>(null);
  const [previewDelete] = useDeleteCategoryMutation();
  const [deleteCategory, { loading }] = useDeleteCategoryMutation({
    refetchQueries: [ListCategoriesDocument],
    update: (cache) => {
      cache.evict({ id: cache.identify({ __typename: "Category", id: props.id }) });
      cache.gc();
    },
  });
  const [restore] = useRestoreBaseCategoryMutation({ refetchQueries: [ListCategoriesDocument] });
  const form = useForm<{ reassignTo: string | null }>({ defaultValues: { reassignTo: null } });

  useEffect(() => {
    previewDelete({ variables: { id: props.id, dryRun: true } })
      .then((r) => setPreview(r.data?.deleteCategory ?? null))
      .catch((e) => toast.error("Could not check the category: " + toastText(e)));
  }, [props.id]);

  const submit = async ({ reassignTo }: { reassignTo: string | null }) => {
    try {
      const { data } = await deleteCategory({ variables: { id: props.id, reassignTo: reassignTo || null } });
      const keys = data?.deleteCategory.dismissedBaseKeys ?? [];
      toast.success("Category deleted", {
        action:
          keys.length > 0
            ? {
                label: "Restore",
                onClick: () =>
                  Promise.all(keys.map((key) => restore({ variables: { key } })))
                    .then(() => toast.success("Restored"))
                    .catch((e) => toast.error("Could not restore: " + toastText(e))),
              }
            : undefined,
      });
      closeDialog();
      if (location.pathname.includes(`/categories/${props.id}`)) navigate("/bank/categories");
    } catch (e) {
      toast.error("Could not delete: " + toastText(e));
    }
  };

  const children = preview ? preview.categories - 1 : 0;
  const goes = preview
    ? [
        children > 0 && (children === 1 ? "1 subcategory" : `${children} subcategories`),
        preview.rules > 0 && plural(preview.rules, "rule"),
        preview.budgets > 0 && plural(preview.budgets, "budget"),
      ].filter(Boolean)
    : [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Delete {props.name ? `"${props.name}"` : "category"}</DialogTitle>
          <DialogDescription>
            {!preview
              ? "Checking what depends on it…"
              : goes.length > 0
                ? `Also deletes ${goes.join(", ")}.`
                : "Nothing else is deleted with it."}
          </DialogDescription>
        </DialogHeader>
        {preview && preview.transactions > 0 && (
          <GraphQLSearchField
            name="reassignTo"
            label={`Move its ${plural(preview.transactions, "transaction")} to`}
            searchQuery={searchCategories}
            description="Leave empty to hand them back to rules and suggestions."
          />
        )}
        {preview && preview.dismissedBaseKeys.length > 0 && (
          <p className="text-xs text-muted-foreground">
            A default category: it is not added back with the defaults, but can be restored.
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={closeDialog}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" disabled={!preview || loading}>
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
