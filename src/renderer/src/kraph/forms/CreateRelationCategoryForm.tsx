import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { GraphQLCreatableSearchField } from "@/core/forms/GraphQLCreateableSearchField";
import { GraphQLSearchField } from "@/core/forms/GraphQLSearchField";
import { ParagraphField } from "@/core/forms/ParagraphField";
import { StringField } from "@/core/forms/StringField";
import { SwitchField } from "@/core/forms/SwitchField";
import { Button } from "@/core/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/core/ui/collapsible";
import { DialogFooter } from "@/core/ui/dialog";
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
    successMessage: "Relation Category created",
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
