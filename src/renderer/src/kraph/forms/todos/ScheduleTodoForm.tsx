import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { Button } from "@/core/ui/button";
import { DialogBody, DialogDescription, DialogFooter, DialogForm, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { DateTimePicker } from "@/core/ui/datetime-picker";
import React from "react";
import { useScheduleTodoItemMutation, useScheduleTodoListMutation } from "../../api/graphql";

/**
 * When a todo item or list is due, and only that (`scheduleTodoItem` /
 * `scheduleTodoList`). No date on an item means its list's date again.
 */
export const ScheduleTodoForm = (props: { kind: "item" | "list"; id: string; current?: string | null }) => {
  const [due, setDue] = React.useState<Date | undefined>(props.current ? new Date(props.current) : undefined);
  const [scheduleItem, item] = useScheduleTodoItemMutation({ refetchQueries: ["TodoSummary"] });
  const [scheduleList, list] = useScheduleTodoListMutation({ refetchQueries: ["TodoList", "TodoItems", "TodoSummary", "SlimTodoItems"] });
  const loading = item.loading || list.loading;

  const { submit } = useDialogSubmit(
    async (dueAt: Date | undefined): Promise<void> => {
      const variables = { id: props.id, dueAt: dueAt ? dueAt.toISOString() : null };
      if (props.kind === "item") await scheduleItem({ variables });
      else await scheduleList({ variables });
    },
    { errorTitle: "Couldn't change the due date" },
  );

  return (
    <DialogForm
      onSubmit={(event) => {
        event.preventDefault();
        void submit(due);
      }}
    >
      <DialogHeader>
        <DialogTitle>{props.kind === "item" ? "When is this item due?" : "When is this list due?"}</DialogTitle>
        <DialogDescription>
          {props.kind === "item"
            ? "Without a date of its own, the item is due when its list is."
            : "Items without a date of their own are due when the list is."}
        </DialogDescription>
      </DialogHeader>
      <DialogBody>
        <DateTimePicker value={due} onChange={setDue} hourCycle={24} placeholder="Pick a date" />
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="ghost" disabled={loading} onClick={() => void submit(undefined)}>
          No date
        </Button>
        <Button type="submit" disabled={loading}>
          Save
        </Button>
      </DialogFooter>
    </DialogForm>
  );
};
