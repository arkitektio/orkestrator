import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { StringField } from "@/core/forms/StringField";
import { Button } from "@/core/ui/button";
import { DialogFooter } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import { CreateProjectMutation, CreateProjectMutationVariables, useCreateProjectMutation } from "../api/graphql";

export const CreateProjectForm = (props: { onSuccess?: (data: CreateProjectMutation | null | undefined) => void }) => {
  const [add] = useCreateProjectMutation();

  const submit = useGraphQLDialog(add, { successMessage: "Project created", onSuccess: props.onSuccess });

  const form = useForm<CreateProjectMutationVariables["input"]>({
    defaultValues: {
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
