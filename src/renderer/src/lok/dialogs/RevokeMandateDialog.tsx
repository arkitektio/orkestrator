import { useDialog } from "@/core/dialogs/registry";
import { toast } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { useState } from "react";
import { MandatesDocument, useRevokeMandateMutation } from "../api/graphql";

/**
 * Withdraw mandates. lok deletes every client provisioned under them, so the
 * apps they started are signed out at once; that cannot be undone, only
 * approved again.
 */
export const RevokeMandateDialog = (props: { ids: string[] }) => {
  const { closeDialog } = useDialog();
  const [revoke] = useRevokeMandateMutation({ refetchQueries: [MandatesDocument] });
  const [busy, setBusy] = useState(false);

  const plural = props.ids.length === 1 ? "this mandate" : `${props.ids.length} mandates`;

  const submit = async () => {
    setBusy(true);
    const results = await Promise.allSettled(props.ids.map((id) => revoke({ variables: { id } })));
    setBusy(false);
    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length === 0) {
      toast.success(props.ids.length === 1 ? "Mandate revoked" : `${props.ids.length} mandates revoked`);
      closeDialog();
      return;
    }
    const reason = (failed[0] as PromiseRejectedResult).reason;
    toast.error(reason instanceof Error ? reason.message : "Could not revoke");
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Revoke {plural}?</DialogTitle>
        <DialogDescription className="mt-2 text-sm font-light">
          Every app instance started under it is signed out immediately and cannot start again. To
          run the app again, it has to be approved again.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={() => closeDialog()} disabled={busy}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={submit} disabled={busy}>
          {busy ? "Revoking…" : "Revoke"}
        </Button>
      </DialogFooter>
    </>
  );
};
