import { useDialog } from "@/core/dialogs/registry";
import { toast } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { useState } from "react";
import { ListAccessLogDocument, useDeleteServerCopyMutation } from "../api/graphql";
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
  const [deleteServerCopy, { loading }] = useDeleteServerCopyMutation({ refetchQueries: [ListAccessLogDocument] });
  const confirmed = typed === DELETE_CONFIRM;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) return;
    try {
      const { data } = await deleteServerCopy({ variables: { confirm: DELETE_CONFIRM } });
      const count = data?.deleteServerCopy ?? 0;
      toast.success(count === 1 ? "Deleted 1 record" : `Deleted ${count} records`);
      closeDialog();
    } catch (error) {
      toast.error("Could not delete: " + (error instanceof Error ? error.message : String(error)));
    }
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
