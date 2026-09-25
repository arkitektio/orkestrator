import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/core/ui/alert-dialog";
import { Button } from "@/core/ui/button";
import { Eraser } from "lucide-react";
import { toast } from "sonner";
import { useCleanupActionsMutation } from "../api/graphql";

/**
 * Housekeeping for the actions catalog. It lives in a sidebar tab rather than
 * the page header: the page is for finding something to run, and an org-wide
 * delete should not sit next to the search box. Cleaning up ONE action is the
 * "Clean Up Action" local action.
 */
export const ActionsManageSidebar = () => {
  const [cleanup, { loading }] = useCleanupActionsMutation({
    // The mutation only reports a count, so re-read the lists it may have cut.
    refetchQueries: ["BrowseActions", "AllActions", "ActionsPageStats"],
  });

  const run = () =>
    cleanup({ variables: {} })
      .then((result) => {
        const removed = result.data?.cleanupActions ?? 0;
        toast.success(
          removed > 0
            ? `Cleaned up ${removed} action${removed === 1 ? "" : "s"}`
            : "Nothing to clean up",
        );
      })
      .catch((error) => toast.error(`Cleanup failed: ${error.message}`));

  return (
    <div className="p-4 space-y-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Manage</h2>
        <p className="text-sm text-muted-foreground">
          Housekeeping for the actions of your organization.
        </p>
      </div>

      <div className="p-4 rounded-lg border border-border space-y-3">
        <div>
          <p className="text-sm font-medium">Clean up unreferenced actions</p>
          <p className="text-xs text-muted-foreground mt-1">
            Apps leave their actions behind when they change or go away. This
            removes every action nothing references anymore; actions still in
            use are left alone.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" disabled={loading}>
              <Eraser className="h-4 w-4" />
              {loading ? "Cleaning up…" : "Clean up"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clean up unreferenced actions?</AlertDialogTitle>
              <AlertDialogDescription>
                Every action in your organization that nothing references
                anymore is deleted. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep</AlertDialogCancel>
              <AlertDialogAction onClick={run}>Clean up</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};
