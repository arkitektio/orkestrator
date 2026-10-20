import { useDialog } from "@/core/dialogs/registry";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { MandatesDocument, useRevokeMandateMutation } from "../api/graphql";

/**
 * Withdraw mandates. lok deletes every client provisioned under them, so the
 * apps they started are signed out at once; that cannot be undone, only
 * approved again.
 */
export const RevokeMandateDialog = (props: { ids: string[] }) => {
  const { closeDialog } = useDialog();
  const [revoke] = useRevokeMandateMutation({ refetchQueries: [MandatesDocument] });

  const plural = props.ids.length === 1 ? "this mandate" : `${props.ids.length} mandates`;

  // The revoked mandates leave the list on screen: no success toast. Every
  // revoke is tried; the first failure stays in the dialog.
  const { submit, submitting: busy } = useDialogSubmit(
    async () => {
      const results = await Promise.allSettled(props.ids.map((id) => revoke({ variables: { id } })));
      const failed = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
      if (failed) throw failed.reason;
    },
    { errorTitle: props.ids.length === 1 ? "Couldn't revoke the mandate" : "Couldn't revoke every mandate" },
  );

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
        <Button variant="destructive" onClick={() => void submit()} disabled={busy}>
          {busy ? "Revoking…" : "Revoke"}
        </Button>
      </DialogFooter>
    </>
  );
};
