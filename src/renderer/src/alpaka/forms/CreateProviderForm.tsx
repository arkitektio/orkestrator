import { useGraphQlFormDialog } from "@/core/components/dialog/FormDialog";
import { ChoicesField } from "@/core/components/fields/ChoicesField";
import { StringField } from "@/core/components/fields/StringField";
import { Button } from "@/core/components/ui/button";
import { DialogFooter } from "@/core/components/ui/dialog";
import { Form } from "@/core/components/ui/form";
import { enumToOptions } from "@/core/lib/utils";
import { useForm } from "react-hook-form";
import {
  CreateProviderMutationVariables,
  ProviderKind,
  useCreateProviderMutation,
} from "../api/graphql";

export default () => {
  const [add] = useCreateProviderMutation();

  const dialog = useGraphQlFormDialog(add);

  const form = useForm<CreateProviderMutationVariables["input"]>({
    defaultValues: {
      name: "",
      apiKey: "",
      kind: ProviderKind.Openai,
    },
  });

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (data) => {
            dialog({
              variables: {
                input: {
                  ...data,
                },
              },
            });
          })}
        >
          <div className="grid grid-cols-1 gap-2">
            <StringField
              label="Name"
              name="name"
              description="How should this provider be called?"
            />
            <ChoicesField
              label="Kind"
              name="kind"
              options={enumToOptions(ProviderKind)}
              description="Which vendor does this provider talk to?"
            />
            <StringField
              label="Api Key"
              name="apiKey"
              description="The credential used to authenticate against the provider. It is stored on the server and never read back."
            />
          </div>

          <DialogFooter className="mt-2">
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};
