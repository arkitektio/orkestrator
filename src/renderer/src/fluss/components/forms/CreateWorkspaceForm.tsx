import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { StringField } from "@arkitektio/bsx/ports/forms/StringField";
import { Button } from "@/core/ui/button";
import {
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import {
  CreateWorkspaceMutation,
  useCreateWorkspaceMutation,
  WorkspaceCarouselDocument,
  WorkspacesDocument,
} from "@/fluss/api/graphql";
import { useForm } from "react-hook-form";

export const CreateWorkspaceForm = (props: { onSuccess?: (data: CreateWorkspaceMutation | null | undefined) => void }) => {
  const [add] = useCreateWorkspaceMutation({
    refetchQueries: [WorkspacesDocument, WorkspaceCarouselDocument],
  });

  const submit = useGraphQLDialog(add, { errorTitle: "Couldn't create the workspace", onSuccess: props.onSuccess });

  const form = useForm({});

  return (
    <>
      <DialogHeader>
        <DialogTitle>New workspace</DialogTitle>
        <DialogDescription>
          A workspace is where you work on a workflow and its versions over
          time.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <DialogForm
          onSubmit={form.handleSubmit(async (data) => {
            submit({
              variables: {
                ...data,
              },
            });
          })}
        >
          <DialogBody>
            <StringField
              label="Name"
              name="name"
              description="The name of the workspace"
            />
          </DialogBody>

          <DialogFooter>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </DialogForm>
      </Form>
    </>
  );
};
