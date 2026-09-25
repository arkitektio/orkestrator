import { useGraphQLDialog } from "@/core/app/hooks/useGraphQLDialog";
import { ParagraphField } from "@/core/components/fields/ParagraphField";
import { StringField } from "@/core/components/fields/StringField";
import { SwitchField } from "@/core/components/fields/SwitchField";
import { Button } from "@/core/components/ui/button";
import { DialogFooter } from "@/core/components/ui/dialog";
import { Form } from "@/core/components/ui/form";
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
    successMessage: "Graph created",
    onSuccess: (data) => {
      if (data) {
        props.onSuccess?.(data);
      }
    },
  });

  const form = useForm<CreateGraphMutationVariables["input"]>({
    defaultValues: {
      name: "New Step",
      description: "No Description",
      backfill: false,
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
                  ...data,
                },
              },
            });
          })}
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 flex-col gap-1 flex">
              <StringField
                label="Name"
                name="name"
                description="How do you can to call this Ontology"
              />
              <ParagraphField
                label="Description"
                name="description"
                description="What describes your ontology the best?"
              />
              <SwitchField
                label="Draw existing evidence"
                name="backfill"
                description="A graph is a view over the organization's evidence. With this on, everything already claimed under a word this schema declares is projected as the graph is created — which takes as long as the evidence base is large. Off, it appears at the next reproject."
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


export default TForm;
