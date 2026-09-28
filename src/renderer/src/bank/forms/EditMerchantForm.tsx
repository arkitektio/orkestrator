import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { GraphQLSearchField } from "@/core/forms/GraphQLSearchField";
import { ParagraphField } from "@/core/forms/ParagraphField";
import { StringField } from "@/core/forms/StringField";
import { SwitchField } from "@/core/forms/SwitchField";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import {
  MerchantFragment,
  useGetMerchantQuery,
  useSearchCategoriesLazyQuery,
  useUpdateMerchantMutation,
} from "../api/graphql";

type Values = {
  name: string;
  description: string;
  category: string | null;
  website: string;
  logoUrl: string;
  online: boolean;
};

const EditMerchant = ({ merchant }: { merchant: MerchantFragment }) => {
  const [update, { loading }] = useUpdateMerchantMutation();
  const [searchCategories] = useSearchCategoriesLazyQuery();
  const submit = useGraphQLDialog(update, { successMessage: "Merchant saved" });
  const form = useForm<Values>({
    defaultValues: {
      name: merchant.name,
      description: merchant.description,
      category: merchant.category?.id ?? null,
      website: merchant.website ?? "",
      logoUrl: merchant.logoUrl ?? "",
      online: merchant.online,
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) =>
          submit({
            variables: {
              input: {
                id: merchant.id,
                name: data.name,
                description: data.description.trim(),
                category: data.category || null,
                website: data.website.trim() || null,
                logoUrl: data.logoUrl.trim() || null,
                online: data.online,
              },
            },
          }),
        )}
        className="flex flex-col gap-4"
      >
        <DialogHeader>
          <DialogTitle>Edit merchant</DialogTitle>
          <DialogDescription>Its category becomes the default for its transactions.</DialogDescription>
        </DialogHeader>
        <StringField name="name" label="Name" />
        <GraphQLSearchField name="category" label="Category" searchQuery={searchCategories} />
        <ParagraphField name="description" label="Notes" placeholder="What this merchant is" />
        <StringField name="website" label="Website" placeholder="https://" />
        <StringField name="logoUrl" label="Logo URL" placeholder="https://" />
        <SwitchField name="online" label="Online only" description="No physical stores to show on the map." />
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

/** Change a merchant: name, category, notes, website, logo, online-only. */
export const EditMerchantForm = (props: { id: string }) => {
  const { data, error } = useGetMerchantQuery({ variables: { id: props.id } });
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return <EditMerchant merchant={data.merchant} />;
};
