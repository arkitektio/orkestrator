import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { StringField } from "@/core/forms/StringField";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import { CreateCollaborationInput, useCreateCollaborationMutation } from "../api/graphql";

export const CreateCollaborationForm = () => {
  const [createCollaboration] = useCreateCollaborationMutation({ refetchQueries: ["GetCollaborations"] });
  const submit = useGraphQLDialog(createCollaboration, {
    errorTitle: "Couldn't create the collaboration",
  });
  const form = useForm<CreateCollaborationInput>({ defaultValues: { name: "New Collaboration" } });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (data) => {
          submit({ variables: { input: { name: data.name, description: data.description || null } } });
        })}
      >
        <DialogHeader>
          <DialogTitle>New Collaboration</DialogTitle>
          <DialogDescription>
            An empty collaboration: put objects in it, then share it with guests by link.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 py-4">
          <StringField label="Name" name="name" placeholder="Shared with the lab" />
          <StringField label="Description" name="description" placeholder="What it is for (optional)" />
        </div>
        <DialogFooter>
          <Button type="submit">Create</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
