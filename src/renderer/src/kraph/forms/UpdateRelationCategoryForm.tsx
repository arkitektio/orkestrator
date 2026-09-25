import { useGraphQlFormDialog } from "@/core/components/dialog/FormDialog";
import { ParagraphField } from "@/core/components/fields/ParagraphField";
import { StringField } from "@/core/components/fields/StringField";
import { Button } from "@/core/components/ui/button";
import { DialogFooter } from "@/core/components/ui/dialog";
import { Form } from "@/core/components/ui/form";
import { useForm } from "react-hook-form";
import {
  RelationCategoryFragment,
  UpdateRelationCategoryMutationVariables,
  useUpdateRelationCategoryMutation
} from "../api/graphql";


const TForm = (props: { relationCategory: RelationCategoryFragment }) => {
  const [update] = useUpdateRelationCategoryMutation({
    refetchQueries: ["GetGraph"],
  });

  const dialog = useGraphQlFormDialog(update);

  const form = useForm<UpdateRelationCategoryMutationVariables["input"]>({
    defaultValues: {
      id: props.relationCategory.id,
      key: props.relationCategory.key,
      label: props.relationCategory.label,
      description: props.relationCategory.description,
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
