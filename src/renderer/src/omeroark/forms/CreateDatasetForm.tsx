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
import { CreateDatasetMutation, CreateDatasetMutationVariables, ListProjectFragment, useCreateDatasetMutation } from "../api/graphql";

export const CreateDatasetForm = (props: { project?: ListProjectFragment; onSuccess?: (data: CreateDatasetMutation | null | undefined) => void }) => {
  const [add] = useCreateDatasetMutation();

  const submit = useGraphQLDialog(add, { errorTitle: "Couldn't create the dataset", onSuccess: props.onSuccess });

  const form = useForm<CreateDatasetMutationVariables["input"]>({
    defaultValues: {
      projectId: props.project?.id ? props.project.id : undefined,
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>New dataset</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <DialogForm
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
          <DialogBody>
            <StringField
              label="Name"
              name="name"
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
