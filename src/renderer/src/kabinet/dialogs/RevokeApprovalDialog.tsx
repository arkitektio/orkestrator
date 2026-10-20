import { useDialog } from "@/core/dialogs/registry";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { useOperation } from "@/core/modules/hooks/useOperation";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Label } from "@/core/ui/label";
import { Switch } from "@/core/ui/switch";
import { useState } from "react";
import {
  ListReleaseApprovalsDocument,
  useListReleaseApprovalsQuery,
  useRevokeApprovalMutation,
} from "../api/graphql";

/**
 * Withdraw release approvals. Kabinet's revoke only stops new deployments;
 * what signs running pods out is revoking the lok mandate behind it, which is
 * on by default and can be left off to let running pods finish.
 */
export const RevokeApprovalDialog = (props: { ids: string[] }) => {
  const { closeDialog } = useDialog();
  const { data } = useListReleaseApprovalsQuery({ variables: { filters: { ids: props.ids } } });
  const [revokeApproval] = useRevokeApprovalMutation({ refetchQueries: [ListReleaseApprovalsDocument] });
  const revokeMandate = useOperation("lok.revokeMandate");
  const [signOut, setSignOut] = useState(true);

  const approvals = data?.releaseApprovals ?? [];
  const title =
    approvals.length === 1 ? `Revoke approval of ${approvals[0].release.name}?` : `Revoke ${props.ids.length} approvals?`;

  // Every approval is tried; the first failure stays in the dialog, and the
  // list behind it shows which ones were revoked.
  const { submit, submitting: busy } = useDialogSubmit(
    async () => {
      const results = await Promise.allSettled(
        approvals.map(async (approval) => {
          if (!approval.revokedAt) await revokeApproval({ variables: { id: approval.id } });
          if (signOut) await revokeMandate({ id: approval.mandateId });
        }),
      );
      const failed = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
      if (failed) throw failed.reason;
    },
    { errorTitle: approvals.length === 1 ? "Couldn't revoke the approval" : "Couldn't revoke every approval" },
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="mt-2 text-sm font-light">
          Nothing new is installed or upgraded under it. To run the release again, it has to be
          approved again.
        </DialogDescription>
      </DialogHeader>
      <div className="mt-4 flex items-center justify-between gap-3">
        <Label htmlFor="revoke-sign-out" className="font-normal">
          Also sign out the pods running under it now
        </Label>
        <Switch id="revoke-sign-out" checked={signOut} onCheckedChange={setSignOut} />
      </div>
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={() => closeDialog()} disabled={busy}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={() => void submit()} disabled={busy || approvals.length === 0}>
          {busy ? "Revoking…" : "Revoke"}
        </Button>
      </DialogFooter>
    </>
  );
};
