import { useGraphQlFormDialog } from "@/core/dialogs/FormDialog";
import { ParagraphField } from "@/core/forms/ParagraphField";
import { StringField } from "@/core/forms/StringField";
import { Button } from "@/core/ui/button";
import { DialogFooter } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import {
  TermFragment,
  UpdateTermMutationVariables,
  useUpdateTermMutation,
} from "../api/graphql";

// `key` and `kind` are the term's identity, so neither is editable here — a
// different word, or the same word naming a different sort of thing, is a
// different term.
const TForm = (props: { term: TermFragment }) => {
  const [update] = useUpdateTermMutation({
    refetchQueries: ["ListTerms", "GetTerm"],
  });

  const dialog = useGraphQlFormDialog(update);

  const form = useForm<UpdateTermMutationVariables["input"]>({
    defaultValues: {
      id: props.term.id,
      label: props.term.label,
      description: props.term.description,
      purl: props.term.purl,
    },
  });

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (data) => {
            dialog({
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
                label="Label"
                name="label"
                description="A human readable name for this word"
              />
              <ParagraphField
                label="Description"
                name="description"
                description="What does this word mean? Every graph that declares it inherits this meaning."
              />
              <StringField
                label="PURL"
                name="purl"
                description="Where this corresponds to a published ontology term"
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};

export default TForm;
