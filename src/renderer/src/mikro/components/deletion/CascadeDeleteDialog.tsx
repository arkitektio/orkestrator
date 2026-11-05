import { useDialog } from "@/core/dialogs/registry";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";

/**
 * The question a lineage-safe delete asks when its preflight found things made
 * from the targets (`useLineageSafeAnnotationDelete`): name what would go
 * along, and only on "Delete all" run the caller's cascading delete. Keep or
 * closing the dialog deletes nothing.
 */
export const CascadeDeleteDialog = (props: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}) => {
  const { closeDialog } = useDialog();
  const { submit, submitting } = useDialogSubmit(() => props.onConfirm(), {
    errorTitle: "Couldn't delete",
  });

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{props.title}</DialogTitle>
        <DialogDescription>{props.description} This action cannot be undone.</DialogDescription>
      </DialogHeader>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={() => closeDialog()} disabled={submitting}>
          Keep
        </Button>
        <Button type="button" variant="destructive" onClick={() => void submit()} disabled={submitting}>
          {submitting ? "Deleting…" : props.confirmLabel}
        </Button>
      </DialogFooter>
    </div>
  );
};

export default CascadeDeleteDialog;
