import { reportErrorAs } from "@/core/notify";
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
import { useDeleteTodoItemMutation } from "@/kraph/api/graphql";
import { useKraph } from "@/kraph/api/funcs";
import { Trash2 } from "lucide-react";
import React from "react";

/**
 * Delete one todo item, after asking. The objects on it are left alone.
 *
 * `beforeEvict` runs between the server's answer and the card leaving the
 * cache: the item's own page navigates away there, so it never renders a
 * missing item. The "Delete todo item" local action does the same from the
 * menu; this is the button on the item itself.
 */
export const DeleteTodoItemButton = ({
  item,
  beforeEvict,
  variant = "icon",
}: {
  item: { id: string; title: string };
  beforeEvict?: () => void;
  variant?: "icon" | "button";
}) => {
  const client = useKraph();
  const [remove, { loading }] = useDeleteTodoItemMutation();
  const [open, setOpen] = React.useState(false);

  const confirm = async () => {
    try {
      await remove({ variables: { id: item.id } });
    } catch (error) {
      reportErrorAs("Couldn't delete the todo item")(error);
      return;
    }
    setOpen(false);
    beforeEvict?.();
    client.cache.evict({ id: client.cache.identify({ __typename: "TodoItem", id: item.id }) });
    client.cache.gc();
    // Only the server knows the lists' Done counts.
    void client.refetchQueries({ include: ["TodoList", "Project", "TodoItems", "TodoTrack", "TodoSummary", "SlimTodoItems"] });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {variant === "icon" ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-destructive"
            aria-label="Delete todo item"
            onClick={(event) => event.stopPropagation()}
          >
            <Trash2 className="size-3.5" />
          </button>
        ) : (
          <Button variant="outline" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(event) => event.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{item.title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            The item leaves its list. The objects on it stay as they are. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={loading}
            onClick={(event) => {
              event.preventDefault();
              void confirm();
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
