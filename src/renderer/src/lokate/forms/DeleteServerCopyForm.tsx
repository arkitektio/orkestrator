import { useDialog } from "@/core/dialogs/registry";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { toast } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { useState } from "react";
import { useDeleteServerCopyMutation } from "../api/graphql";
import { DELETE_CONFIRM } from "../format";

/**
 * Delete everything lokate holds for the user: points, visits, trips and
 * places from every phone. The phones keep their own copy (and upload again
 * unless stopped), so this is "delete the server copy", confirmed by typing
 * DELETE — the word the mutation itself requires.
 */
export const DeleteServerCopyForm = () => {
  const { closeDialog } = useDialog();
  const [typed, setTyped] = useState("");
  const [deleteServerCopy, { loading }] = useDeleteServerCopyMutation({ refetchQueries: "active" });
  const confirmed = typed === DELETE_CONFIRM;

  // How much went is nowhere else to be seen: said in a toast.
  const { submit: run } = useDialogSubmit(() => deleteServerCopy({ variables: { confirm: DELETE_CONFIRM } }), {
    errorTitle: "Couldn't delete the server copy",
    onSuccess: ({ data }) => {
      const count = data?.deleteServerCopy ?? 0;
      toast.success(count === 1 ? "Deleted 1 record" : `Deleted ${count} records`);
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmed) run();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Delete the server copy</DialogTitle>
        <DialogDescription>
          Deletes every point, visit, trip and place stored on this server, from all your phones. Your phones keep
          their own copy and will upload new data unless you turn syncing off there.
        </DialogDescription>
      </DialogHeader>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">
          Type <span className="font-mono font-semibold text-foreground">{DELETE_CONFIRM}</span> to confirm
        </span>
        <Input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </label>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={closeDialog}>
          Cancel
        </Button>
        <Button type="submit" variant="destructive" disabled={!confirmed || loading}>
          {loading ? "Deleting..." : "Delete everything"}
        </Button>
      </DialogFooter>
    </form>
  );
};
