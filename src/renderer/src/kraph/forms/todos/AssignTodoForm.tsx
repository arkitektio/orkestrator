import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { useStructureOptions } from "@/core/modules/hooks/useStructureOptions";
import { Button } from "@/core/ui/button";
import { DialogBody, DialogDescription, DialogFooter, DialogForm, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { SearchField } from "@arkitektio/bsx/ports/forms/SearchField";
import { useForm } from "react-hook-form";
import { useAssignTodoItemMutation, useAssignTodoListMutation } from "../../api/graphql";

type Values = { assignee: string | null };

/**
 * Who a todo item or list is for, and only that (`assignTodoItem` /
 * `assignTodoList`): the title, the description and the objects stay as they
 * are. Nobody on an item means its list's assignee again.
 */
export const AssignTodoForm = (props: { kind: "item" | "list"; id: string; current?: string | null }) => {
  const searchUsers = useStructureOptions("@lok/user");
  const [assignItem, item] = useAssignTodoItemMutation({ refetchQueries: ["TodoItems", "TodoSummary", "SlimTodoItems"] });
  const [assignList, list] = useAssignTodoListMutation({ refetchQueries: ["TodoList", "TodoItems", "TodoSummary", "SlimTodoItems"] });
  const loading = item.loading || list.loading;
  const form = useForm<Values>({ defaultValues: { assignee: props.current ?? null } });

  const { submit } = useDialogSubmit(
    async (values: Values): Promise<void> => {
      const variables = { id: props.id, assignee: values.assignee || null };
      if (props.kind === "item") await assignItem({ variables });
      else await assignList({ variables });
    },
    { errorTitle: "Couldn't change who it is for" },
  );

  return (
    <Form {...form}>
      <DialogForm onSubmit={form.handleSubmit((values) => submit(values))}>
        <DialogHeader>
          <DialogTitle>{props.kind === "item" ? "Who is this item for?" : "Who is this list for?"}</DialogTitle>
          <DialogDescription>
            {props.kind === "item"
              ? "Leave it empty to give the item back to the list's assignee."
              : "Items without an assignee of their own follow the list."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {searchUsers && <SearchField name="assignee" label="Assignee" search={searchUsers} placeholder="Pick a member" />}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" disabled={loading} onClick={() => form.setValue("assignee", null)}>
            Nobody
          </Button>
          <Button type="submit" disabled={loading}>
            Assign
          </Button>
        </DialogFooter>
      </DialogForm>
    </Form>
  );
};
