import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { GraphQLCreatableSearchField } from "@/core/forms/GraphQLCreateableSearchField";
import { ParagraphField } from "@arkitektio/bsx/ports/forms/ParagraphField";
import { StringField } from "@arkitektio/bsx/ports/forms/StringField";
import { Button } from "@/core/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/core/ui/collapsible";
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
  CreateStructureRelationCategoryMutation,
  CreateStructureRelationCategoryMutationVariables,
  useCreateInlineGraphMutation,
  useCreateStructureRelationCategoryMutation,
  useSearchGraphsLazyQuery,
} from "../api/graphql";



export const TForm = (props: { graph?: string; onSuccess?: (data: CreateStructureRelationCategoryMutation) => void }) => {
  const [add] = useCreateStructureRelationCategoryMutation({
    refetchQueries: ["GetGraph"],
  });

  const [create] = useCreateInlineGraphMutation();

  const submit = useGraphQLDialog(add, {
    errorTitle: "Couldn't create the structure relation category",
    onSuccess: (data) => {
      if (data) {
        props.onSuccess?.(data);
      }
    },
  });

  const form = useForm<CreateStructureRelationCategoryMutationVariables["input"]>({
    defaultValues: {
      graph: props.graph,
    },
  });


  const [search] = useSearchGraphsLazyQuery();

  return (
    <>
      <DialogHeader>
        <DialogTitle>New structure relation category</DialogTitle>
        <DialogDescription>A kind of relation between structures from other modules (images, files, …).</DialogDescription>
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
            {!props.graph && (
              <>
                <GraphQLCreatableSearchField
                  label="Graph"
                  name="graph"
                  description="What graph do you want to add this expression to?"
                  searchQuery={search}
                  createMutation={create}
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
            <Collapsible>
              <CollapsibleTrigger>Advanced</CollapsibleTrigger>
              <CollapsibleContent>
                <StringField
                  label="PURL"
                  name="purl"
                  description="What is the PURL of this expression?"
                />
              </CollapsibleContent>
            </Collapsible>
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
