import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { structureLabel } from "@/core/modules/export/structureLabel";
import { useStructureOptions } from "@/core/modules/hooks/useStructureOptions";
import type { Structure } from "@/core/types";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { ParagraphField } from "@arkitektio/bsx/ports/forms/ParagraphField";
import { SearchField } from "@arkitektio/bsx/ports/forms/SearchField";
import { StringField } from "@arkitektio/bsx/ports/forms/StringField";
import { useForm } from "react-hook-form";
import { TodoListDocument, useCreateTodoItemMutation } from "../../api/graphql";
import { todoTitleFor } from "../../lib/todos";

type Values = { title: string; description: string; assignee: string | null };

/** A new card on a todo list, optionally with the objects it is about. */
export const CreateTodoItemForm = (props: { list: string; structures?: Structure[] }) => {
  const searchUsers = useStructureOptions("@lok/user");
  const [create, { loading }] = useCreateTodoItemMutation({
    refetchQueries: [{ query: TodoListDocument, variables: { id: props.list } }, "TodoItems"],
  });
  // No title typed: the item is named after what it is about, if anything.
  const defaultTitle = todoTitleFor((props.structures ?? []).map(structureLabel));
  const { submit } = useDialogSubmit(
    async (values: Values) => {
      const title = values.title.trim() || defaultTitle;
      if (!title) throw new Error("Give the item a title.");
      return create({
        variables: {
          input: {
            list: props.list,
            title,
            description: values.description || null,
            assignee: values.assignee || null,
            structures: props.structures?.map((structure) => ({ identifier: structure.identifier, object: structure.id })),
          },
        },
      });
    },
    { errorTitle: "Couldn't create the item" },
  );
  const form = useForm<Values>({ defaultValues: { title: "", description: "", assignee: null } });

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-3"
        onSubmit={form.handleSubmit(submit)}
      >
        <DialogHeader>
          <DialogTitle>New todo item</DialogTitle>
          <DialogDescription>Something to do. Drop images on its card later to put them on it.</DialogDescription>
        </DialogHeader>
        <StringField
          name="title"
          label="Title"
          placeholder={defaultTitle ?? "Annotate the nuclei"}
          description={defaultTitle ? "Leave empty to name it after the objects" : undefined}
        />
        <ParagraphField name="description" label="Description" description="More about what is to be done (optional)" />
        {searchUsers && (
          <SearchField
            name="assignee"
            label="Assignee"
            search={searchUsers}
            placeholder="The list's assignee"
            description="Leave empty to give it to the list's assignee"
          />
        )}
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            Create
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default CreateTodoItemForm;
