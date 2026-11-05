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
import { AgentFragment, useUpdateAgentMutation } from "../api/graphql";

export const UpdateAgentForm = (props: { agent: AgentFragment }) => {
  const [updateAgent] = useUpdateAgentMutation();

  const submit = useGraphQLDialog(updateAgent, {
    errorTitle: "Couldn't rename the agent",
  });

  const form = useForm({
    defaultValues: {
      name: props.agent.name,
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Rename agent</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <DialogForm
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
          <DialogBody>
            <StringField
              label="Name"
              name="name"
              description="The agent display name"
            />
          </DialogBody>

          <DialogFooter>
            <Button type="submit">Rename</Button>
          </DialogFooter>
        </DialogForm>
      </Form>
    </>
  );
};
