import { useDialog } from "@/core/dialogs/registry";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { Button } from "@/core/ui/button";
import { DialogBody, DialogDescription, DialogFooter, DialogForm, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Label } from "@/core/ui/label";
import { Textarea } from "@/core/ui/textarea";
import { useId, useState } from "react";
import { BugReportsDocument, useResolveBugReportMutation } from "../api/graphql";

/** Close a bug report, with a note for whoever reads it later. */
export const ResolveBugReportDialog = ({ id }: { id: string }) => {
  const { closeDialog } = useDialog();
  const [resolve] = useResolveBugReportMutation();
  const [note, setNote] = useState("");
  const noteId = useId();

  // The page shows the report as resolved: no toast.
  const { submit, submitting } = useDialogSubmit(
    () => resolve({ variables: { input: { id, note: note.trim() || null } }, refetchQueries: [BugReportsDocument] }),
    { errorTitle: "Couldn't resolve the report" },
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Resolve this report</DialogTitle>
        <DialogDescription>It leaves the list of open reports. It can be reopened.</DialogDescription>
      </DialogHeader>
      <DialogForm
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <DialogBody>
          <div className="space-y-1.5">
            <Label htmlFor={noteId}>Note</Label>
            <Textarea
              id={noteId}
              autoFocus
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional: how it was dealt with"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={closeDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Resolving…" : "Resolve"}
          </Button>
        </DialogFooter>
      </DialogForm>
    </>
  );
};

export default ResolveBugReportDialog;
