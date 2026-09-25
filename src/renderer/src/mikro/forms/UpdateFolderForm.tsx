import { useGraphQLDialog } from "@/app/hooks/useGraphQLDialog";
import { StringField } from "@/components/fields/StringField";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { FolderFragment, useUpdateFolderMutation } from "../api/graphql";

export const UpdateFolderForm = (props: { folder: FolderFragment }) => {
  const [updateFolder] = useUpdateFolderMutation();

  const submit = useGraphQLDialog(updateFolder, {
    successMessage: "Folder updated",
  });

  const form = useForm({
    defaultValues: {
      name: props.folder.name,
    },
  });

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (data) => {
            submit({
              variables: {
                id: props.folder.id,
                name: data.name,
              },
            });
          })}
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 flex-col gap-1 flex">
              <StringField
                label="New Name"
                name="name"
                description="The Name Value"
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button type="submit">Change</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};
