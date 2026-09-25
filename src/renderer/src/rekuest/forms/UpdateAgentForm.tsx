import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { StringField } from "@/core/components/fields/StringField";
import { Button } from "@/core/components/ui/button";
import { DialogFooter } from "@/core/components/ui/dialog";
import { Form } from "@/core/components/ui/form";
import { useForm } from "react-hook-form";
import { AgentFragment, useUpdateAgentMutation } from "../api/graphql";

export const UpdateAgentForm = (props: { agent: AgentFragment }) => {
  const [updateAgent] = useUpdateAgentMutation();

  const submit = useGraphQLDialog(updateAgent, {
    successMessage: "Agent updated",
  });

  const form = useForm({
    defaultValues: {
      name: props.agent.name,
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
                  id: props.agent.id,
                  name: data.name,
                },
              },
            });
          })}
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 flex flex-col gap-1">
              <StringField
                label="New Name"
                name="name"
                description="The agent display name"
              />
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
