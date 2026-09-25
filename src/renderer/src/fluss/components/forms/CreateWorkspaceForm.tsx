import { useGraphQLDialog } from "@/core/app/hooks/useGraphQLDialog";
import { StringField } from "@/core/components/fields/StringField";
import { Button } from "@/core/components/ui/button";
import { DialogFooter, DialogHeader } from "@/core/components/ui/dialog";
import { Form } from "@/core/components/ui/form";
import {
  CreateWorkspaceMutation,
  useCreateWorkspaceMutation,
  WorkspaceCarouselDocument,
  WorkspacesDocument,
} from "@/fluss/api/graphql";
import { DialogDescription } from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";

export const CreateWorkspaceForm = (props: { onSuccess?: (data: CreateWorkspaceMutation | null | undefined) => void }) => {
  const [add] = useCreateWorkspaceMutation({
    refetchQueries: [WorkspacesDocument, WorkspaceCarouselDocument],
  });

  const submit = useGraphQLDialog(add, { successMessage: "Workspace created", onSuccess: props.onSuccess });

  const form = useForm({});

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (data) => {
            submit({
              variables: {
                ...data,
              },
            });
          })}
        >
          <DialogHeader>
            <h1>Create a new Workspace</h1>
          </DialogHeader>

          <DialogDescription className="font-light text-sm mt-2">
            A workspace is way for you to work on a workflow and its various
            versions over time.
          </DialogDescription>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <StringField
              label="Lets give it a name"
              name="name"
              description="The name of the workspace"
            />
          </div>

          <DialogFooter className="mt-2">
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};
