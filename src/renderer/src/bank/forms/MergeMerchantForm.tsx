import { useDialog } from "@/core/dialogs/registry";
import { GraphQLSearchField } from "@/core/forms/GraphQLSearchField";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ListMerchantsDocument, useMergeMerchantsMutation, useSearchMerchantsLazyQuery } from "../api/graphql";
import { toastText } from "../errors";
import { BankMerchant } from "../linkers";

/** Fold a merchant into another: aliases, places and transactions move over, it is deleted. */
export const MergeMerchantForm = (props: { id: string }) => {
  const { closeDialog } = useDialog();
  const navigate = useNavigate();
  const [searchMerchants] = useSearchMerchantsLazyQuery();
  const [merge, { loading }] = useMergeMerchantsMutation({
    refetchQueries: [ListMerchantsDocument],
    update: (cache) => {
      cache.evict({ id: cache.identify({ __typename: "Merchant", id: props.id }) });
      cache.gc();
    },
  });
  const form = useForm<{ into: string | null }>({ defaultValues: { into: null } });

  const submit = async ({ into }: { into: string | null }) => {
    if (!into || into === props.id) {
      form.setError("into", { message: "Pick another merchant" });
      return;
    }
    try {
      await merge({ variables: { merchant: props.id, into } });
      toast.success("Merchants merged");
      closeDialog();
      navigate(BankMerchant.linkBuilder(into));
    } catch (e) {
      toast.error("Could not merge: " + toastText(e));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Merge into…</DialogTitle>
          <DialogDescription>
            Its aliases, places and transactions move to the merchant you pick; this one is deleted.
          </DialogDescription>
        </DialogHeader>
        <GraphQLSearchField name="into" label="Merge into" searchQuery={searchMerchants} />
        <DialogFooter>
          <Button type="submit" variant="destructive" disabled={loading}>
            {loading ? "Merging..." : "Merge"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
