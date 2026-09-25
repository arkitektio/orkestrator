import { useDialog } from "@/core/app/dialog";
import { GraphQLCreatableSearchField } from "@/core/components/fields/GraphQLCreateableSearchField";
import { Button } from "@/core/components/ui/button";
import { DialogFooter } from "@/core/components/ui/dialog";
import { Form } from "@/core/components/ui/form";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  AssertEntityExistsMutationVariables,
  GetEntityCategoryDocument,
  useAssertEntityExistsMutation,
  useCreateEntityTermInlineMutation,
  useGetEntityCategoryQuery,
  useSearchEntityTermsLazyQuery,
} from "../api/graphql";

// A claim names the organization's word, not the category row it was started
// from. The category (when the dialog was opened from one) only seeds the
// field — the word stays editable, and typing an unused one claims it. A graph
// that declares no category for the word simply will not draw it.
const TForm = (props: { category?: string }) => {
  const { data } = useGetEntityCategoryQuery({
    variables: { id: props.category as string },
    skip: !props.category,
  });

  const seededTerm = data?.entityCategory.term?.key ?? data?.entityCategory.key;

  const [add] = useAssertEntityExistsMutation({
    refetchQueries: props.category
      ? [{ query: GetEntityCategoryDocument, variables: { id: props.category } }]
      : [],
  });

  const [searchTerms] = useSearchEntityTermsLazyQuery();
  const [createTerm] = useCreateEntityTermInlineMutation();

  const { closeDialog } = useDialog();

  const form = useForm<AssertEntityExistsMutationVariables["input"]>({
    defaultValues: { term: "" },
  });

  useEffect(() => {
    if (seededTerm && !form.getValues("term")) {
      form.setValue("term", seededTerm);
    }
  }, [seededTerm, form]);

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (data) => {
            add({ variables: { input: { term: data.term } } })
              .then(closeDialog)
              .catch((e) => {
                toast.error("Error creating entity:", e);
              });
          })}
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 flex-col gap-1 flex">
              <GraphQLCreatableSearchField
                name="term"
                label="Claim as"
                description="The organization's word for what is being claimed, e.g. 'AIS'. Type a new word to claim it."
                searchQuery={searchTerms}
                createMutation={createTerm}
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};

export default TForm
