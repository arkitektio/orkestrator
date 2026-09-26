import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { ChoicesField } from "@/core/forms/ChoicesField";
import { GraphQLSearchField } from "@/core/forms/GraphQLSearchField";
import { StringField } from "@/core/forms/StringField";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import {
  CategoryKind,
  ListCategoriesDocument,
  useCreateCategoryMutation,
  useSearchCategoriesLazyQuery,
} from "../api/graphql";
import { ColorField } from "./ColorField";
import { KIND_OPTIONS } from "./options";

type Values = { name: string; kind: CategoryKind; parent: string | null; color: string | null };

/** A new category, optionally nested under `parent`. */
export const CreateCategoryForm = (props: { parent?: string; kind?: CategoryKind }) => {
  const [create, { loading }] = useCreateCategoryMutation({ refetchQueries: [ListCategoriesDocument] });
  const [searchCategories] = useSearchCategoriesLazyQuery();
  const submit = useGraphQLDialog(create, { successMessage: "Category created" });

  const form = useForm<Values>({
    defaultValues: {
      name: "",
      kind: props.kind ?? CategoryKind.Expense,
      parent: props.parent ?? null,
      color: null,
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) =>
          submit({
            variables: {
              input: { name: data.name, kind: data.kind, parent: data.parent || null, color: data.color },
            },
          }),
        )}
        className="flex flex-col gap-4"
      >
        <DialogHeader>
          <DialogTitle>New category</DialogTitle>
          <DialogDescription>
            Categories nest: spending in a child also counts towards its parent's budget.
          </DialogDescription>
        </DialogHeader>
        <StringField name="name" label="Name" placeholder="Groceries" />
        <ChoicesField name="kind" label="Kind" options={KIND_OPTIONS} />
        <GraphQLSearchField
          name="parent"
          label="Parent"
          searchQuery={searchCategories}
          description="Leave empty for a top-level category."
        />
        <ColorField name="color" />
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
