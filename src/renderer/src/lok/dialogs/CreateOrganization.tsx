

import { useDialog } from "@/core/app/dialog";
import { StringField } from "@/core/components/fields/StringField";
import { DialogHeader, DialogTitle } from "@/core/components/ui/dialog";
import { Form } from "@/core/components/ui/form";
import { useCreateOrganizationMutation } from "@/lok/api/graphql";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type CreateOrganizationForm = {
  name: string;
  description?: string;
};

export const CreateOrganizationForm = () => {
  const [add] = useCreateOrganizationMutation();

  const { closeDialog } = useDialog();

  const dialog = async (data: CreateOrganizationForm) => {

    try {
      add({
        variables: {
          input: {
            name: data.name,
            description: data.description
          },
        },
      })
      toast.success("Organization created successfully");
      return { data: { success: true } };
    } catch (error) {
      toast.error("Failed to create organization");
      throw error;
    } finally {
      closeDialog();
    }
  }

  const form = useForm<CreateOrganizationForm>({
    defaultValues: {
      name: "",
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(dialog)}
      >
        <DialogHeader>
          <DialogTitle>New Organization</DialogTitle>
        </DialogHeader>

        <StringField name="name" label="Organization Name" description="The name of the organization" />
        <StringField name="description" label="Description" description="A short description" />


        <button type="submit" className="btn btn-primary mt-4">
          Create Organization
        </button>

      </form>
    </Form>
  );
};

