import { useFormDialog } from "@/core/dialogs/FormDialog";
import { ChoicesField } from "@/core/forms/ChoicesField";
import { StringField } from "@/core/forms/StringField";
import { Button } from "@/core/ui/button";
import { DialogFooter } from "@/core/ui/dialog";
import { ErrorNote } from "@/core/ui/error-note";
import { Form } from "@/core/ui/form";
import { enumToOptions } from "@/core/util/utils";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  CreateProviderMutationVariables,
  ProviderKind,
  useCreateProviderMutation,
} from "../api/graphql";

export default () => {
  const [add, { loading }] = useCreateProviderMutation();
  // The sheet closes once the provider exists; a refusal stays in it, by the button.
  const { onSubmit } = useFormDialog();
  const [failure, setFailure] = useState<unknown>(null);

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
            setFailure(null);
            try {
              const result = await add({
                variables: {
                  input: {
                    ...data,
                  },
                },
              });
              onSubmit(result.data);
            } catch (e) {
              setFailure(e);
            }
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

          <ErrorNote error={failure} title="Couldn't add the provider" className="mt-2" />
          <DialogFooter className="mt-2">
            <Button type="submit" disabled={loading}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};
