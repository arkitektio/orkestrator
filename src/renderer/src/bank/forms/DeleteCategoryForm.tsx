import { useDialogError } from "@/core/dialogs/DialogError";
import { useDialog } from "@/core/dialogs/registry";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
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
import { asBankError, reportBankErrorAs } from "../errors";

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
  const [checkFailed, setCheckFailed] = useState(false);
  const { report } = useDialogError();
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
      .catch((e) => {
        setCheckFailed(true);
        report(asBankError(e), "Couldn't check the category");
      });
  }, [props.id]);

  // The list drops it in place; only a deleted default category gets a toast,
  // to carry its Restore.
  const { submit } = useDialogSubmit(
    ({ reassignTo }: { reassignTo: string | null }) =>
      deleteCategory({ variables: { id: props.id, reassignTo: reassignTo || null } }).catch((e) =>
        Promise.reject(asBankError(e)),
      ),
    {
      errorTitle: "Couldn't delete the category",
      onSuccess: ({ data }) => {
        const keys = data?.deleteCategory.dismissedBaseKeys ?? [];
        if (keys.length > 0)
          toast.success("Category deleted", {
            action: {
              label: "Restore",
              onClick: () =>
                Promise.all(keys.map((key) => restore({ variables: { key } })))
                  .then(() => toast.success("Category restored"))
                  .catch(reportBankErrorAs("Couldn't restore the category")),
            },
          });
        if (location.pathname.includes(`/categories/${props.id}`)) navigate("/bank/categories");
      },
    },
  );

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
              ? checkFailed
                ? "Couldn't check what depends on it."
                : "Checking what depends on it…"
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
