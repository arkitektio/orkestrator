import { useGraphQlFormDialog } from "@/core/dialogs/FormDialog";
import { ParagraphField } from "@/core/forms/ParagraphField";
import { StringField } from "@/core/forms/StringField";
import { Button } from "@/core/ui/button";
import { DialogFooter } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import {
  MeasurementCategoryFragment,
  UpdateMeasurementCategoryMutationVariables,
  useUpdateMeasurementCategoryMutation
} from "../api/graphql";


const TForm = (props: {
  measurementCategory: MeasurementCategoryFragment;
}) => {
  const [update] = useUpdateMeasurementCategoryMutation({
    refetchQueries: ["GetGraph"],
  });

  const dialog = useGraphQlFormDialog(update);

  const form = useForm<UpdateMeasurementCategoryMutationVariables["input"]>({
    defaultValues: {
      id: props.measurementCategory.id,
      key: props.measurementCategory.key,
      label: props.measurementCategory.label,
      description: props.measurementCategory.description,
      // No `source` / `target`. The update input carries decoration only now —
      // a category's descriptors are declared when it is created, and changing
      // what a measurement may connect would change which claims the view draws.
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
