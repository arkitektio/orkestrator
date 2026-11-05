import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { ParagraphField } from "@arkitektio/bsx/ports/forms/ParagraphField";
import { StringField } from "@arkitektio/bsx/ports/forms/StringField";
import { SwitchField } from "@/core/forms/SwitchField";
import { Button } from "@/core/ui/button";
import {
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import {
  CreateGraphMutation,
  CreateGraphMutationVariables,
  HomePageDocument,
  useCreateGraphMutation,
} from "../api/graphql";

const TForm = (props: { onSuccess?: (data: CreateGraphMutation) => void }) => {
  const [add] = useCreateGraphMutation({
    refetchQueries: [HomePageDocument],
  });

  const submit = useGraphQLDialog(add, {
    errorTitle: "Couldn't create the graph",
    onSuccess: (data) => {
      if (data) {
        props.onSuccess?.(data);
      }
    },
  });

  const form = useForm<CreateGraphMutationVariables["input"]>({
    defaultValues: {
      name: "New graph",
      description: "",
      backfill: false,
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>New graph</DialogTitle>
        <DialogDescription>A view over the organization's evidence, shaped by the words it declares.</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <DialogForm
          onSubmit={form.handleSubmit(async (data) => {
            submit({
              variables: {
                input: {
                  ...data,
                },
              },
            });
          })}
        >
          <DialogBody>
            <StringField
              label="Name"
              name="name"
              description="What to call this graph"
            />
            <ParagraphField
              label="Description"
              name="description"
              description="What is this graph about?"
            />
            <SwitchField
              label="Draw existing evidence"
              name="backfill"
              description="A graph is a view over the organization's evidence. With this on, everything already claimed under a word this schema declares is projected as the graph is created — which takes as long as the evidence base is large. Off, it appears at the next reproject."
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

export default TForm;
