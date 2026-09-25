import { useGraphQlFormDialog } from "@/core/components/dialog/FormDialog";
import { ParagraphField } from "@/core/components/fields/ParagraphField";
import { StringField } from "@/core/components/fields/StringField";
import { Button } from "@/core/components/ui/button";
import { DialogFooter } from "@/core/components/ui/dialog";
import { Form } from "@/core/components/ui/form";
import { useForm } from "react-hook-form";
import { GraphFragment, useUpdateGraphMutation } from "../api/graphql";

export const UpdateGraphForm = (props: { graph: GraphFragment }) => {
  const [add] = useUpdateGraphMutation();

  const dialog = useGraphQlFormDialog(add);

  const form = useForm({
    defaultValues: {
      description: props.graph.description,
      name: props.graph.name,
    },
  });

  const onSubmitted = async (data: any) => {
    dialog({
      variables: {
        input: {
          id: props.graph.id,
          ...data,
        },
      },
    });
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitted)}>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 flex-col gap-1 flex">
              <StringField
                label="New name"
                name="name"
                description="The new name"
              />
              <ParagraphField
                label="New Name"
                name="description"
                description="The new description"
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button type="submit">Change</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};
