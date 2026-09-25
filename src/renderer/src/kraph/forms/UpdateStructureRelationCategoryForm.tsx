import { useGraphQlFormDialog } from "@/core/dialogs/FormDialog";
import { ParagraphField } from "@/core/forms/ParagraphField";
import { StringField } from "@/core/forms/StringField";
import { Button } from "@/core/ui/button";
import { DialogFooter } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import {
  StructureRelationCategoryFragment,
  UpdateStructureRelationCategoryMutationVariables,
  useUpdateStructureRelationCategoryMutation
} from "../api/graphql";


export const TForm = (props: {
  structureRelationCategory: StructureRelationCategoryFragment;
}) => {
  const [update] = useUpdateStructureRelationCategoryMutation({
    refetchQueries: ["GetGraph"],
  });

  const dialog = useGraphQlFormDialog(update);

  const form = useForm<
    UpdateStructureRelationCategoryMutationVariables["input"]
  >({
    defaultValues: {
      id: props.structureRelationCategory.id,
      key: props.structureRelationCategory.key,
      label: props.structureRelationCategory.label,
      description: props.structureRelationCategory.description,
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
                description="Whats the expression? (e.g. 'Person' or 'Connected to')"
              />
              <ParagraphField
                label="Description"
                name="description"
                description="What describes your expression the best? (e.g. 'A person is a human being')"
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
