import { useDialog } from "@/app/dialog";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { ArgsContainer } from "@/components/widgets/ArgsContainer";
import { FormActionDescription } from "@/lib/rekuest/ActionDescription";
import {
  ActionFilter,
  DemandKind,
  PortKind,
  useAllPrimaryActionsQuery,
} from "@/rekuest/api/graphql";
import { buildAssignInput } from "@/rekuest/assign";
import { useAction } from "@/rekuest/hooks/useAction";
import { usePortForm } from "@/rekuest/hooks/usePortForm";
import { useWidgetRegistry } from "@/rekuest/widgets/WidgetsContext";
import { ArrowLeft, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { usePendingHooksStore } from "@/lib/taskhooks/pendingHooksStore";
import { ELEKTRO_DOWNLOAD_HOOK } from "../hooks/taskHooks";

export const NEURON_MODEL_IDENTIFIER = "@elektro/neuronmodel";
export const ELEKTRO_FILE_IDENTIFIER = "@elektro/file";

/**
 * An "exporter" is a rekuest action that takes a NeuronModel as an argument and
 * returns an elektro File. Filter the action registry down to exactly those.
 */
const EXPORTER_FILTER: ActionFilter = {
  demands: [
    {
      kind: DemandKind.Args,
      matches: [{ kind: PortKind.Structure, identifier: NEURON_MODEL_IDENTIFIER }],
    },
    {
      kind: DemandKind.Returns,
      matches: [{ kind: PortKind.Structure, identifier: ELEKTRO_FILE_IDENTIFIER }],
    },
  ],
};

export type ExportModelFormProps = {
  modelId: string;
  modelName?: string | null;
};

/**
 * Convenience button (used on the NeuronModel detail page) that opens the
 * exporter dialog. The dialog is the canonical entry point; a matching local
 * action opens the same dialog from the SmartContext menu / ObjectButton.
 */
export const ExportModelButton = (props: {
  object: { id: string; name?: string | null };
}) => {
  const { openDialog } = useDialog();
  return (
    <Button
      variant="outline"
      onClick={() =>
        openDialog("exportelektromodel", {
          modelId: props.object.id,
          modelName: props.object.name,
        })
      }
    >
      <Download className="h-4 w-4 mr-2" />
      Export
    </Button>
  );
};

export const ExportModelForm = (props: ExportModelFormProps) => {
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(
    null,
  );

  if (selected) {
    return (
      <ExporterRunForm
        actionId={selected.id}
        exporterName={selected.name}
        modelId={props.modelId}
        modelName={props.modelName}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <ExporterList
      modelName={props.modelName}
      onSelect={(id, name) => setSelected({ id, name })}
    />
  );
};

const ExporterList = (props: {
  modelName?: string | null;
  onSelect: (id: string, name: string) => void;
}) => {
  const { data, loading } = useAllPrimaryActionsQuery({
    variables: { filters: EXPORTER_FILTER },
  });

  const exporters = data?.actions ?? [];

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Export {props.modelName || "Model"}</DialogTitle>
        <DialogDescription>
          Choose an exporter to run on this neuron model. The resulting file will
          download automatically when the export finishes.
        </DialogDescription>
      </DialogHeader>
      <div className="mt-4 flex flex-col gap-2">
        {loading && exporters.length === 0 && (
          <div className="text-muted-foreground text-sm">Loading exporters…</div>
        )}
        {!loading && exporters.length === 0 && (
          <div className="text-muted-foreground text-sm">
            No exporters available for this model.
          </div>
        )}
        {exporters.map((exporter) => (
          <button
            key={exporter.id}
            type="button"
            onClick={() => props.onSelect(exporter.id, exporter.name)}
            className="flex flex-col items-start gap-1 rounded-md border border-muted-foreground/10 p-3 text-left transition-colors hover:bg-muted/50"
          >
            <div className="flex w-full items-center gap-2">
              <Download className="h-4 w-4 shrink-0" />
              <span className="font-medium">{exporter.name}</span>
            </div>
            {exporter.description && (
              <span className="text-muted-foreground text-sm">
                {exporter.description}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

const ExporterRunForm = (props: {
  actionId: string;
  exporterName: string;
  modelId: string;
  modelName?: string | null;
  onBack: () => void;
}) => {
  const { assign, action } = useAction({ id: props.actionId });
  const { closeDialog } = useDialog();
  const { registry } = useWidgetRegistry();
  const addPendingHook = usePendingHooksStore((s) => s.addPendingHook);

  // Preset (and hide) every arg that expects the NeuronModel we are exporting.
  const preset =
    action?.args
      .filter((arg) => arg.identifier === NEURON_MODEL_IDENTIFIER)
      .reduce<Record<string, unknown>>((acc, arg) => {
        acc[arg.key] = props.modelId;
        return acc;
      }, {}) ?? {};

  // ArgsContainer hides fields by key -> true, while usePortForm seeds their
  // values via `overwrites`.
  const hidden = Object.keys(preset).reduce<{ [key: string]: boolean }>(
    (acc, key) => {
      acc[key] = true;
      return acc;
    },
    {},
  );

  const form = usePortForm({
    ports: action?.args || [],
    overwrites: preset,
  });

  const onSubmit = async (data: any) => {
    const reference = uuidv4();
    try {
      const task = await assign(
        buildAssignInput({
          action: props.actionId,
          args: data,
          reference,
        }),
      );

      addPendingHook({
        reference,
        taskId: task.id,
        hookType: ELEKTRO_DOWNLOAD_HOOK,
        params: {
          modelName: props.modelName,
          exporterName: props.exporterName,
        },
      });

      toast.info(`Export started — “${props.exporterName}” is running.`);
      closeDialog();
    } catch (e: any) {
      toast.error(`Couldn't start export: ${e?.message ?? e}`);
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={props.onBack}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <DialogTitle>{action?.name || props.exporterName}</DialogTitle>
        </div>
      </DialogHeader>
      <DialogDescription className="mt-2" asChild>
        <div>
          {action?.description && (
            <FormActionDescription
              description={action.description}
              control={form.control}
            />
          )}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-4 space-y-6"
            >
              <ArgsContainer
                registry={registry}
                groups={action?.portGroups || []}
                ports={action?.args || []}
                hidden={hidden}
                path={[]}
              />
              <div className="flex justify-end">
                <Button type="submit" variant="outline" disabled={isSubmitting}>
                  <Download className="h-4 w-4 mr-2" />
                  Export{isSubmitting ? "ing…" : ""}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogDescription>
    </div>
  );
};
