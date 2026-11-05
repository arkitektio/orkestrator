import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { StringField } from "@arkitektio/bsx/ports/forms/StringField";
import { Button } from "@/core/ui/button";
import {
  DialogBody,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import { FolderFragment, useUpdateFolderMutation } from "../api/graphql";

export const UpdateFolderForm = (props: { folder: FolderFragment }) => {
  const [updateFolder] = useUpdateFolderMutation();

  const submit = useGraphQLDialog(updateFolder, {
    errorTitle: "Couldn't rename the folder",
  });

  const form = useForm({
    defaultValues: {
      name: props.folder.name,
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Rename folder</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <DialogForm
          onSubmit={form.handleSubmit(async (data) => {
            submit({
              variables: {
                id: props.folder.id,
                name: data.name,
              },
            });
          })}
        >
          <DialogBody>
            <StringField
              label="Name"
              name="name"
            />
          </DialogBody>

          <DialogFooter>
            <Button type="submit">Rename</Button>
          </DialogFooter>
        </DialogForm>
      </Form>
    </>
  );
};
