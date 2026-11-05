import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { GraphQLCreatableSearchField } from "@/core/forms/GraphQLCreateableSearchField";
import { GraphQLSearchField } from "@/core/forms/GraphQLSearchField";
import { ParagraphField } from "@arkitektio/bsx/ports/forms/ParagraphField";
import { StringField } from "@arkitektio/bsx/ports/forms/StringField";
import { SwitchField } from "@/core/forms/SwitchField";
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
  CreateRelationCategoryMutation,
  CreateRelationCategoryMutationVariables,
  useCreateInlineGraphMutation,
  useCreateRelationCategoryMutation,
  useSearchEntityCategoryLazyQuery,
  useSearchGraphsLazyQuery,
} from "../api/graphql";


export const TForm = (props: { graph?: string; onSuccess?: (data: CreateRelationCategoryMutation) => void }) => {
  const [add] = useCreateRelationCategoryMutation({
    refetchQueries: ["GetGraph"],
  });

  const [create] = useCreateInlineGraphMutation();

  const submit = useGraphQLDialog(add, {
    errorTitle: "Couldn't create the relation category",
    onSuccess: (data) => {
      if (data) {
        props.onSuccess?.(data);
      }
    },
  });

  const form = useForm<CreateRelationCategoryMutationVariables["input"]>({
    defaultValues: {
      graph: props.graph,
      backfill: false,
    },
  });

  const [searchEntityCategory] = useSearchEntityCategoryLazyQuery();

  const [search] = useSearchGraphsLazyQuery();

  return (
    <>
      <DialogHeader>
        <DialogTitle>New relation category</DialogTitle>
        <DialogDescription>A kind of relation between two entities.</DialogDescription>
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
                <div className="col-span-2 flex-col gap-1 flex">
                  <GraphQLSearchField
                    name={`sourceDefinition.categoryFilters`}
                    label="Category Filters"
                    searchQuery={searchEntityCategory}
                    description="Filters for the entity's categories."
                  />
                </div>
                <div className="col-span-2 flex-col gap-1 flex">
                  <GraphQLSearchField
                    name={`targetDefinition.categoryFilters`}
                    label="Category Filters"
                    searchQuery={searchEntityCategory}
                    description="Filters for the entity's categories."
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </DialogBody>

              <SwitchField
                label="Draw existing evidence"
                name="backfill"
                description="Claims already made under this word are in the organization's evidence base. With this on they are projected into the graph now, instead of waiting for the next reproject — which takes as long as the evidence base is large."
              />
          <DialogFooter>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </DialogForm>
      </Form>
    </>
  );
};


export default TForm;
