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
import {
  CreateServiceInstanceInput,
  CreateServiceInstanceMutation,
  useCreateServiceInstanceMutation
} from "../api/graphql";

export const CreateServiceInstanceForm = (props: { identifier?: string; onSuccess?: (data: CreateServiceInstanceMutation | null | undefined) => void }) => {
  const [createServiceInstance] = useCreateServiceInstanceMutation();

  const submit = useGraphQLDialog(createServiceInstance, {
    errorTitle: "Couldn't create the service instance",
    onSuccess: props.onSuccess,
  });

  const form = useForm<CreateServiceInstanceInput>({
    defaultValues: {
      identifier: props.identifier,
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>New service instance</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <DialogForm
          onSubmit={form.handleSubmit(async (data) => {
            return await submit({
              variables: {
                input: data,
              },
            });
          })}
        >
          <DialogBody>
            {!props.identifier && (
              <StringField
                label="Service identifier"
                name="identifier"
                description="The identifier of the service"
              />
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </DialogForm>
      </Form>
    </>
  );
};
