

import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { StringField } from "@/core/forms/StringField";
import { DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useCreateOrganizationMutation } from "@/lok/api/graphql";
import { useForm } from "react-hook-form";

type CreateOrganizationForm = {
  name: string;
  description?: string;
};

export const CreateOrganizationForm = () => {
  const [add] = useCreateOrganizationMutation();

  const { submit, submitting } = useDialogSubmit(
    (data: CreateOrganizationForm) =>
      add({
        variables: {
          input: {
            name: data.name,
            description: data.description
          },
        },
      }),
    { errorTitle: "Couldn't create the organization" },
  );

  const form = useForm<CreateOrganizationForm>({
    defaultValues: {
      name: "",
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(submit)}
      >
        <DialogHeader>
          <DialogTitle>New Organization</DialogTitle>
        </DialogHeader>

        <StringField name="name" label="Organization Name" description="The name of the organization" />
        <StringField name="description" label="Description" description="A short description" />


        <button type="submit" className="btn btn-primary mt-4" disabled={submitting}>
          Create Organization
        </button>

      </form>
    </Form>
  );
};

