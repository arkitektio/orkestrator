import { useDialog } from "@/core/dialogs/registry";
import { GraphQLCreatableSearchField } from "@/core/forms/GraphQLCreateableSearchField";
import { GraphQLSearchField } from "@/core/forms/GraphQLSearchField";
import { StringField } from "@/core/forms/StringField";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "@/core/notify";
import {
  AssignMerchantInput,
  ListMerchantsDocument,
  MerchantCandidatesDocument,
  useAssignMerchantMutation,
  useCreateMerchantOptionMutation,
  useSearchMerchantLocationsLazyQuery,
  useSearchMerchantsLazyQuery,
} from "../api/graphql";
import { toastText } from "../errors";

type Values = { merchant: string | null; location: string | null; storeCode: string };

/**
 * Say who one or more transactions were with and, optionally, at which of
 * its places — an existing one, or a new store number (the place is created).
 * Set by hand, the link is never changed by aliases or rules. A merchant
 * typed in that does not exist yet can be created on the spot; it learns its
 * alias from these transactions.
 */
export const AssignMerchantForm = (props: { ids: string[]; merchant?: string | null; location?: string | null }) => {
  const [assign] = useAssignMerchantMutation();
  const [searchMerchants] = useSearchMerchantsLazyQuery();
  const [searchLocations] = useSearchMerchantLocationsLazyQuery();
  const [createMerchant] = useCreateMerchantOptionMutation({
    refetchQueries: [ListMerchantsDocument, MerchantCandidatesDocument],
  });
  const { closeDialog } = useDialog();
  const [busy, setBusy] = useState(false);
  const form = useForm<Values>({
    defaultValues: { merchant: props.merchant ?? null, location: props.location ?? null, storeCode: "" },
  });
  const merchant = form.watch("merchant");

  const apply = async (input: AssignMerchantInput, done: string) => {
    setBusy(true);
    try {
      await assign({ variables: { input } });
      toast.success(done);
      closeDialog();
    } catch (e) {
      toast.error("Could not set the merchant: " + toastText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) =>
          data.merchant
            ? apply(
                {
                  transactions: props.ids,
                  merchant: { id: data.merchant },
                  location: data.location
                    ? { id: data.location }
                    : data.storeCode.trim()
                      ? { storeCode: data.storeCode.trim() }
                      : null,
                },
                "Merchant set",
              )
            : form.setError("merchant", { message: "Pick a merchant, or clear it" }),
        )}
        className="flex flex-col gap-4"
      >
        <DialogHeader>
          <DialogTitle>
            Set merchant of {props.ids.length === 1 ? "transaction" : `${props.ids.length} transactions`}
          </DialogTitle>
          <DialogDescription>Set by hand, it is never changed by aliases or rules.</DialogDescription>
        </DialogHeader>
        <GraphQLCreatableSearchField
          name="merchant"
          label="Merchant"
          searchQuery={searchMerchants}
          createMutation={({ variables }) =>
            createMerchant({ variables: { name: variables.input.trim(), fromTransactions: props.ids } })
          }
          commandPlaceholder="Search or type a new merchant…"
          noOptionFoundPlaceholder="No merchant found"
        />
        {merchant && (
          <>
            <GraphQLSearchField
              name="location"
              label="Place"
              searchQuery={searchLocations}
              additionalVariables={{ merchant }}
              description="Optional: which of its stores."
            />
            {!form.watch("location") && (
              <StringField
                name="storeCode"
                label="…or a new store number"
                placeholder="3418"
                description="Creates the place if the merchant has none with this number."
              />
            )}
          </>
        )}
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => apply({ transactions: props.ids, merchant: null }, "Merchant cleared")}
          >
            Clear, let aliases decide
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
