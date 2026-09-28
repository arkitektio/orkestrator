import { useGraphQlFormDialog } from "@/core/dialogs/FormDialog";
import { ParagraphField } from "@/core/forms/ParagraphField";
import { StringField } from "@/core/forms/StringField";
import { Button } from "@/core/ui/button";
import { DialogFooter } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import {
  MetricKindFragment,
  UpdateMetricKindMutationVariables,
  useUpdateMetricKindMutation
} from "../api/graphql";



const TForm = (props: { metricKind: MetricKindFragment }) => {
  const [update] = useUpdateMetricKindMutation({
    refetchQueries: ["ListStructureKinds", "ListMetricKinds"],
  });

  const dialog = useGraphQlFormDialog(update);

  const form = useForm<UpdateMetricKindMutationVariables["input"]>({
    defaultValues: {
      id: props.metricKind.id,
      label: props.metricKind.label,
      description: props.metricKind.description,
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
              <StringField
                label="PURL"
                name="purl"
                description="What is the PURL of this expression?"
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
