import { useGraphQLDialog } from "@/app/hooks/useGraphQLDialog";
import { StringField } from "@/components/fields/StringField";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import {
  CreateServiceInstanceInput,
  CreateServiceInstanceMutation,
  useCreateServiceInstanceMutation
} from "../api/graphql";

export const CreateServiceInstanceForm = (props: { identifier?: string; onSuccess?: (data: CreateServiceInstanceMutation | null | undefined) => void }) => {
  const [createServiceInstance] = useCreateServiceInstanceMutation();

  const submit = useGraphQLDialog(createServiceInstance, { successMessage: "Service Instance created", onSuccess: props.onSuccess });

  const form = useForm<CreateServiceInstanceInput>({
    defaultValues: {
      identifier: props.identifier,
    },
  });

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (data) => {
            return await submit({
              variables: {
                input: data,
              },
            });
          })}
        >
          <div className="grid grid-cols-2 gap-2 w-full">
            <div className="col-span-2 flex-col gap-1 flex">
              {!props.identifier && (
                <StringField
                  label="Service identifier"
                  name="identifier"
                  description="The identifier of the service"
                />
              )}
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
