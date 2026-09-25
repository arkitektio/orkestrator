import { DefaultKind, useUseModelForMutation } from "@/alpaka/api/graphql";
import { useDialog } from "@/core/dialogs/registry";
import { ChoicesField } from "@/core/components/fields/ChoicesField";
import { Button } from "@/core/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/core/components/ui/dialog";
import { Form } from "@/core/components/ui/form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type UseModelForFormData = {
  kind: DefaultKind;
};

const USE_CASE_OPTIONS: { label: string; value: DefaultKind }[] = [
  { label: "Image Generation", value: DefaultKind.ImageGeneration },
  { label: "Text Generation", value: DefaultKind.TextGeneration },
  { label: "Embeddings", value: DefaultKind.Embedding },
];

export const UseModelForDialog = (props: { model: string }) => {
  const [useModelFor, { loading }] = useUseModelForMutation();
  const { closeDialog } = useDialog();

  const handleUseModelFor = async (data: UseModelForFormData) => {
    try {
      await useModelFor({
        variables: {
          input: {
            model: props.model,
            kind: data.kind,
          },
        },
      });
      toast.success(
        `Model set for ${
          USE_CASE_OPTIONS.find((option) => option.value === data.kind)?.label ??
          data.kind
        }`,
      );
      closeDialog();
    } catch (error) {
      toast.error("Failed to set model for use case");
      console.error(error);
    }
  };

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
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Setting..." : "Set"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
