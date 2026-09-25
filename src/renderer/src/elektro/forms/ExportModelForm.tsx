import { useDialog } from "@/app/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const NEURON_MODEL_IDENTIFIER = "@elektro/neuronmodel";

/**
 * Convenience button (used on the NeuronModel detail page) that opens the
 * generic export dialog (`lib/export/ExportToFileDialog.tsx`). The same dialog
 * is reached from the "Export to file" local action and by dragging the model
 * out onto the desktop.
 */
export const ExportModelButton = (props: {
  object: { id: string; name?: string | null };
}) => {
  const { openDialog } = useDialog();
  return (
    <Button
      variant="outline"
      onClick={() =>
        openDialog(
          "exporttofile",
          {
            structure: {
              identifier: NEURON_MODEL_IDENTIFIER,
              id: props.object.id,
              ...(props.object.name ? { label: props.object.name } : {}),
            },
          },
          { size: "medium" },
        )
      }
    >
      <Download className="h-4 w-4 mr-2" />
      Export
    </Button>
  );
};
