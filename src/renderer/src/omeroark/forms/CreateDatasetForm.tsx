import { useGraphQLDialog } from "@/app/hooks/useGraphQLDialog";
import { StringField } from "@/components/fields/StringField";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { CreateDatasetMutation, CreateDatasetMutationVariables, ListProjectFragment, useCreateDatasetMutation } from "../api/graphql";

export const CreateDatasetForm = (props: { project?: ListProjectFragment; onSuccess?: (data: CreateDatasetMutation | null | undefined) => void }) => {
  const [add] = useCreateDatasetMutation();

  const submit = useGraphQLDialog(add, { successMessage: "Dataset created", onSuccess: props.onSuccess });

  const form = useForm<CreateDatasetMutationVariables["input"]>({
    defaultValues: {
      projectId: props.project?.id ? props.project.id : undefined,
    },
  });

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (data) => {
            submit({
              variables: {
                input: {
                  ...data
                },
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
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};
