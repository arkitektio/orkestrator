import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { GraphQLSearchField } from "@/core/forms/GraphQLSearchField";
import { ParagraphField } from "@/core/forms/ParagraphField";
import { StringField } from "@/core/forms/StringField";
import { SwitchField } from "@/core/forms/SwitchField";
import { Button } from "@/core/ui/button";
import { DialogFooter } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import {
  CreateProtocolEventCategoryMutationVariables,
  CreateNaturalEventCategoryMutation,
  useCreateNaturalEventCategoryMutation,
  useSearchGraphsLazyQuery
} from "../api/graphql";

const TForm = (props: { graph?: string; onSuccess?: (data: CreateNaturalEventCategoryMutation) => void }) => {
  const [add] = useCreateNaturalEventCategoryMutation({
    refetchQueries: ["GetGraph"],
  });

  const submit = useGraphQLDialog(add, {
    successMessage: "Natural Event Category created",
    onSuccess: (data) => {
      if (data) {
        props.onSuccess?.(data);
      }
    },
  });

  const form = useForm<CreateProtocolEventCategoryMutationVariables["input"]>({
    defaultValues: {
      graph: props.graph,
      backfill: false,
    },
  });

  const [search] = useSearchGraphsLazyQuery();

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
              {!props.graph && (
                <>
                  <GraphQLSearchField
                    label="Graph"
                    name="graph"
                    description="What graph do you want to add this expression to?"
                    searchQuery={search}
                  />
                </>
              )}
              <StringField
                label="Label"
                name="label"
                description="Whats the expression? (e.g. 'Person' or 'Connected to')"
              />
              <ParagraphField
                label="Description"
                name="description"
                description="What describes your expression the best? (e.g. 'A person is a human being')"
              />
              <StringField
                label="PURL"
                name="purl"
                description="What is the PURL of this expression?"
              />
            </div>
          </div>

              <SwitchField
                label="Draw existing evidence"
                name="backfill"
                description="Claims already made under this word are in the organization's evidence base. With this on they are projected into the graph now, instead of waiting for the next reproject — which takes as long as the evidence base is large."
              />
          <DialogFooter className="mt-2">
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};


export default TForm;
