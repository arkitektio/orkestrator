import { useDialog } from "@/core/dialogs/registry";
import { GraphQLSearchField } from "@/core/forms/GraphQLSearchField";
import { ParagraphField } from "@/core/forms/ParagraphField";
import { StringField } from "@/core/forms/StringField";
import { SwitchField } from "@/core/forms/SwitchField";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "@/core/notify";
import {
  ListMerchantsDocument,
  MerchantCandidatesDocument,
  useCreateMerchantMutation,
  useSearchCategoriesLazyQuery,
} from "../api/graphql";
import { toastText } from "../errors";
import { BankMerchant } from "../linkers";

type Values = { name: string; aliases: string; category: string | null; website: string; online: boolean; description: string };

/**
 * A new merchant. From a discovered candidate it takes that candidate's
 * transactions (`fromTransactions`): their text becomes its alias and their
 * store numbers its places.
 */
export const CreateMerchantForm = (props: {
  name?: string;
  aliases?: string[];
  category?: string | null;
  fromTransactions?: string[];
}) => {
  const { closeDialog } = useDialog();
  const navigate = useNavigate();
  const [create, { loading }] = useCreateMerchantMutation({
    refetchQueries: [ListMerchantsDocument, MerchantCandidatesDocument],
  });
  const [searchCategories] = useSearchCategoriesLazyQuery();
  const form = useForm<Values>({
    defaultValues: {
      name: props.name ?? "",
      aliases: (props.aliases ?? []).join(", "),
      category: props.category ?? null,
      website: "",
      online: false,
      description: "",
    },
  });
  const count = props.fromTransactions?.length ?? 0;

  const submit = async (data: Values) => {
    try {
      const aliases = data.aliases
        .split(",")
        .map((alias) => alias.trim())
        .filter(Boolean);
      const { data: result } = await create({
        variables: {
          input: {
            name: data.name.trim(),
            aliases: aliases.length ? aliases : null,
            category: data.category || null,
            website: data.website.trim() || null,
            online: data.online,
            description: data.description.trim(),
            fromTransactions: props.fromTransactions?.length ? props.fromTransactions : null,
          },
        },
      });
      toast.success("Merchant created");
      closeDialog();
      if (result) navigate(BankMerchant.linkBuilder(result.createMerchant.id));
    } catch (e) {
      toast.error("Could not create the merchant: " + toastText(e));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>New merchant</DialogTitle>
          <DialogDescription>
            {count > 0
              ? `Takes over ${count} ${count === 1 ? "transaction" : "transactions"}; their store numbers become places.`
              : "Transactions whose text matches an alias are linked to it."}
          </DialogDescription>
        </DialogHeader>
        <StringField name="name" label="Name" placeholder="Spar" />
        <StringField
          name="aliases"
          label="Aliases"
          placeholder="spar dankt, interspar"
          description="Comma-separated texts that mean this merchant on a bank line."
        />
        <GraphQLSearchField
          name="category"
          label="Category"
          searchQuery={searchCategories}
          description="The default category of its transactions."
        />
        <StringField name="website" label="Website" placeholder="https://" />
        <ParagraphField name="description" label="Notes" placeholder="What this merchant is" />
        <SwitchField name="online" label="Online only" description="No physical stores to show on the map." />
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
