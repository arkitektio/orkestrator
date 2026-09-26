import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { ChoicesField } from "@/core/forms/ChoicesField";
import { GraphQLSearchField } from "@/core/forms/GraphQLSearchField";
import { ParagraphField } from "@/core/forms/ParagraphField";
import { StringField } from "@/core/forms/StringField";
import { SwitchField } from "@/core/forms/SwitchField";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import {
  CategoryFragment,
  CategoryKind,
  ListCategoriesDocument,
  useGetCategoryQuery,
  useSearchCategoriesLazyQuery,
  useUpdateCategoryMutation,
} from "../api/graphql";
import { ColorField } from "./ColorField";
import { KIND_OPTIONS } from "./options";

type Values = {
  name: string;
  description: string;
  kind: CategoryKind;
  parent: string | null;
  color: string | null;
  hidden: boolean;
};

const EditCategory = ({ category }: { category: CategoryFragment }) => {
  const [update, { loading }] = useUpdateCategoryMutation({ refetchQueries: [ListCategoriesDocument] });
  const [searchCategories] = useSearchCategoriesLazyQuery();
  const submit = useGraphQLDialog(update, { successMessage: "Category saved" });

  const form = useForm<Values>({
    defaultValues: {
      name: category.name,
      description: category.description,
      kind: category.kind,
      parent: category.parent?.id ?? null,
      color: category.color ?? null,
      hidden: category.hidden,
    },
  });
  const isRoot = !form.watch("parent");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) =>
          submit({
            variables: {
              input: {
                id: category.id,
                name: data.name,
                description: data.description.trim(),
                parent: data.parent || null,
                color: data.color,
                hidden: data.hidden,
                // Only a top-level category has its own kind; a child takes its root's.
                ...(isRoot ? { kind: data.kind } : {}),
              },
            },
          }),
        )}
        className="flex flex-col gap-4"
      >
        <DialogHeader>
          <DialogTitle>Edit category</DialogTitle>
          <DialogDescription>
            {category.isBase ? "A default category; it stays fully editable." : "Changes apply to its whole subtree."}
          </DialogDescription>
        </DialogHeader>
        <StringField name="name" label="Name" />
        <ParagraphField
          name="description"
          label="Description"
          placeholder="supermarket, bakery, farmers market"
          description="What belongs here, in words your bank lines use. Each comma-separated phrase helps suggestions and search find it."
        />
        {isRoot && <ChoicesField name="kind" label="Kind" options={KIND_OPTIONS} />}
        <GraphQLSearchField
          name="parent"
          label="Parent"
          searchQuery={searchCategories}
          description="Leave empty for a top-level category. Moving it takes the new parent's kind."
        />
        <ColorField name="color" />
        <SwitchField
          name="hidden"
          label="Hidden"
          description="Left out of pickers, suggestions and automatic assignment."
        />
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

/** Change a category: name, description (its search terms), parent, colour, hidden. */
export const EditCategoryForm = (props: { id: string }) => {
  const { data, error } = useGetCategoryQuery({ variables: { id: props.id } });
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return <EditCategory category={data.category} />;
};
