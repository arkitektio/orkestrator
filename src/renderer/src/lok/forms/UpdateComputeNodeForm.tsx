import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { StringField } from "@arkitektio/bsx/ports/forms/StringField";
import { Button } from "@/core/ui/button";
import {
  DialogBody,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import { DetailDeviceFragment, UpdateDeviceMutationVariables, useUpdateDeviceMutation } from "../api/graphql";

export const UpdateComputeNodeForm = (props: {
  computeNode: Partial<DetailDeviceFragment>;
}) => {
  const [updateComputeNode] = useUpdateDeviceMutation();

  // The new name shows on the page behind the sheet: no success toast.
  const update = useGraphQLDialog(updateComputeNode, {
    errorTitle: "Couldn't rename the device",
  });

  const form = useForm<UpdateDeviceMutationVariables["input"]>({
    defaultValues: {
      id: props.computeNode.id,
      name: props.computeNode.name ?? "",
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Rename device</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <DialogForm
          onSubmit={form.handleSubmit(async (data) => {
            return await update({
              variables: {
                input: data,
              },
            });
          })}
        >
          <DialogBody>
            <StringField
              label="Name"
              name="name"
              description="The name of the compute node."
            />
          </DialogBody>
          <DialogFooter>
            <Button type="submit">Rename</Button>
          </DialogFooter>
        </DialogForm>
      </Form>
    </>
  );
};
