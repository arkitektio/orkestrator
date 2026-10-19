import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { GraphQLSearchField } from "@/core/forms/GraphQLSearchField";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { ListMerchantsDocument, useMergeMerchantsMutation, useSearchMerchantsLazyQuery } from "../api/graphql";
import { asBankError } from "../errors";
import { BankMerchant } from "../linkers";

/** Fold a merchant into another: aliases, places and transactions move over, it is deleted. */
export const MergeMerchantForm = (props: { id: string }) => {
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

  // Opens the merchant it was merged into: that is the confirmation.
  const { submit: mergeInto } = useDialogSubmit(
    async (into: string) => {
      await merge({ variables: { merchant: props.id, into } }).catch((e) => Promise.reject(asBankError(e)));
      return into;
    },
    { errorTitle: "Couldn't merge the merchants", onSuccess: (into) => navigate(BankMerchant.linkBuilder(into)) },
  );

  const submit = ({ into }: { into: string | null }) => {
    if (!into || into === props.id) {
      form.setError("into", { message: "Pick another merchant" });
      return;
    }
    return mergeInto(into);
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
