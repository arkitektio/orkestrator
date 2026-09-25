import { useGraphQlFormDialog } from "@/core/components/dialog/FormDialog";
import { StringField } from "@/core/components/fields/StringField";
import { Button } from "@/core/components/ui/button";
import { DialogFooter } from "@/core/components/ui/dialog";
import { Form } from "@/core/components/ui/form";
import { useForm } from "react-hook-form";
import { DetailDeviceFragment, UpdateDeviceMutationVariables, useUpdateDeviceMutation } from "../api/graphql";

export const UpdateComputeNodeForm = (props: {
  computeNode: Partial<DetailDeviceFragment>;
}) => {
  const [updateComputeNode] = useUpdateDeviceMutation();

  const update = useGraphQlFormDialog(updateComputeNode);

  const form = useForm<UpdateDeviceMutationVariables["input"]>({
    defaultValues: {
      id: props.computeNode.id,
      name: props.computeNode.name ?? "",
    },
  });

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (data) => {
            return await update({
              variables: {
                input: data,
              },
            });
          })}
        >
          <div className="grid grid-cols-2 gap-2 w-full">
            <div className="col-span-2 flex-col gap-1 flex">
              <StringField
                label="Name"
                name="name"
                description="The name of the compute node."
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button type="submit">Update</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};
