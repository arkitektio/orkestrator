import { DefaultKind, useUseModelForMutation } from "@/alpaka/api/graphql";
import { useDialog } from "@/core/dialogs/registry";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { ChoicesField } from "@/core/forms/ChoicesField";
import { Button } from "@/core/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";

type UseModelForFormData = {
  kind: DefaultKind;
};

const USE_CASE_OPTIONS: { label: string; value: DefaultKind }[] = [
  { label: "Image Generation", value: DefaultKind.ImageGeneration },
  { label: "Text Generation", value: DefaultKind.TextGeneration },
  { label: "Embeddings", value: DefaultKind.Embedding },
  { label: "Decisions", value: DefaultKind.Decision },
];

export const UseModelForDialog = (props: { model: string }) => {
  const [useModelFor, { loading }] = useUseModelForMutation();
  const { closeDialog } = useDialog();

  const { submit: handleUseModelFor, submitting } = useDialogSubmit(
    (data: UseModelForFormData) =>
      useModelFor({
        variables: {
          input: {
            model: props.model,
            kind: data.kind,
          },
        },
      }),
    { errorTitle: "Couldn't set the model for this use" },
  );

  const form = useForm<UseModelForFormData>({
    defaultValues: {
      kind: DefaultKind.ImageGeneration,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleUseModelFor)}>
        <DialogHeader>
          <DialogTitle>Use Model For</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <ChoicesField
            name="kind"
            label="Use Case"
            description="Select the use case for this model"
            options={USE_CASE_OPTIONS}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={closeDialog}
            disabled={loading || submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading || submitting}>
            {loading ? "Setting..." : "Set"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
