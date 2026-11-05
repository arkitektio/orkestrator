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
import { CreateProjectMutation, CreateProjectMutationVariables, useCreateProjectMutation } from "../api/graphql";

export const CreateProjectForm = (props: { onSuccess?: (data: CreateProjectMutation | null | undefined) => void }) => {
  const [add] = useCreateProjectMutation();

  const submit = useGraphQLDialog(add, { errorTitle: "Couldn't create the project", onSuccess: props.onSuccess });

  const form = useForm<CreateProjectMutationVariables["input"]>({
    defaultValues: {
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>New project</DialogTitle>
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
