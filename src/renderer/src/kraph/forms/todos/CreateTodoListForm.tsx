import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { useStructureOptions } from "@/core/modules/hooks/useStructureOptions";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { ParagraphField } from "@arkitektio/bsx/ports/forms/ParagraphField";
import { SearchField } from "@arkitektio/bsx/ports/forms/SearchField";
import { StringField } from "@arkitektio/bsx/ports/forms/StringField";
import { useForm } from "react-hook-form";
import { CreateTodoListMutation, ProjectDocument, useCreateTodoListMutation } from "../../api/graphql";
import { DueDateField } from "./DueDateField";

type Values = { name: string; description: string; assignee: string | null; dueAt: Date | null };

/**
 * A new todo list in a project, usually handed to one person. The assignee is
 * a lok user; kraph keeps their sub, which is the user's lok id.
 */
export const CreateTodoListForm = (props: {
  project: string;
  onSuccess?: (data: CreateTodoListMutation) => void;
}) => {
  const searchUsers = useStructureOptions("@lok/user");
  const [create, { loading }] = useCreateTodoListMutation({
    refetchQueries: [{ query: ProjectDocument, variables: { id: props.project } }],
  });
  const submit = useGraphQLDialog(create, {
    errorTitle: "Couldn't create the list",
    onSuccess: (data) => data && props.onSuccess?.(data),
  });
  const form = useForm<Values>({ defaultValues: { name: "", description: "", assignee: null, dueAt: null } });

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-3"
        onSubmit={form.handleSubmit((values) =>
          submit({
            variables: {
              input: {
                project: props.project,
                name: values.name,
                description: values.description || null,
                assignee: values.assignee || null,
                dueAt: values.dueAt ? values.dueAt.toISOString() : null,
              },
            },
          }),
        )}
      >
        <DialogHeader>
          <DialogTitle>New todo list</DialogTitle>
          <DialogDescription>A list of things to do. Its items are for the assignee unless an item names someone else.</DialogDescription>
        </DialogHeader>
        <StringField name="name" label="Name" placeholder="Tiago's images" />
        <ParagraphField name="description" label="Description" description="What the list is for (optional)" />
        {searchUsers && (
          <SearchField name="assignee" label="Assignee" search={searchUsers} placeholder="Pick a member" description="Who the list is for (optional)" />
        )}
        <DueDateField description="Items without a date of their own follow it (optional)" />
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            Create
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default CreateTodoListForm;
