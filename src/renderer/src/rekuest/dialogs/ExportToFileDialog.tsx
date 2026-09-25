import { useDialog } from "@/app/dialog";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { ArgsContainer } from "@/components/ports/ArgsContainer";
import { FormActionDescription } from "@/lib/ports/ActionDescription";
import { usePendingHooksStore } from "@/lib/taskhooks/pendingHooksStore";
import { smartRegistry } from "@/providers/smart/registry";
import {
  ActionFilter,
  DemandKind,
  PortKind,
  useAllPrimaryActionsQuery,
} from "@/rekuest/api/graphql";
import { buildAssignInput } from "@/rekuest/assign";
import { useAction } from "@/rekuest/hooks/useAction";
import { usePortForm } from "@/lib/ports/usePortForm";
import { useWidgetRegistry } from "@/lib/ports/WidgetsContext";
import { Structure } from "@/types";
import { ArrowLeft, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import { FILE_DOWNLOADERS } from "@/app/modules/registries";
import { structureLabel } from "@/lib/export/structureLabel";
import { FILE_DOWNLOAD_HOOK } from "@/lib/export/taskHooks";

export type ExportToFileDialogProps = {
  structure: Structure;
};

/**
 * An "exporter" is a rekuest action that takes the structure as an argument
 * and returns a file the app can download.
 */
const exporterFilter = (identifier: string, fileIdentifier: string): ActionFilter => ({
  demands: [
    {
      kind: DemandKind.Args,
      matches: [{ kind: PortKind.Structure, identifier }],
    },
    {
      kind: DemandKind.Returns,
      matches: [{ kind: PortKind.Structure, identifier: fileIdentifier }],
    },
  ],
});

/**
 * Turn any smart model into a file on disk: pick an exporter, fill in what it
 * asks for (the model itself is preset and hidden), and the file downloads
 * when the task finishes — through a persisted task hook, so a long export
 * survives a reload.
 *
 * Opened by dragging a card out onto the desktop (`providers/smart/dragOut.ts`)
 * and by the "Export to file" local action.
 */
export const ExportToFileDialog = ({ structure }: ExportToFileDialogProps) => {
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const label = structureLabel(structure);

  if (selected) {
    return (
      <ExporterRunForm
        actionId={selected.id}
        exporterName={selected.name}
        structure={structure}
        label={label}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <ExporterList
      structure={structure}
      label={label}
      onSelect={(id, name) => setSelected({ id, name })}
    />
  );
};

/**
 * Exporters for every file type the app can download. A demand filter is an
 * AND, so each file type is its own query; the list is the union.
 */
const useExporters = (identifier: string) => {
  const results = Object.keys(FILE_DOWNLOADERS).map((fileIdentifier) =>
    // The list is a module constant, so the hooks are called in a fixed order.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAllPrimaryActionsQuery({
      variables: { filters: exporterFilter(identifier, fileIdentifier) },
    }),
  );

  const seen = new Set<string>();
  const exporters = results
    .flatMap((result) => result.data?.actions ?? [])
    .filter((action) => !seen.has(action.id) && seen.add(action.id));
  return { exporters, loading: results.some((result) => result.loading) };
};

const ExporterList = (props: {
  structure: Structure;
  label: string;
  onSelect: (id: string, name: string) => void;
}) => {
  const { exporters, loading } = useExporters(props.structure.identifier);

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Export {props.label}</DialogTitle>
        <DialogDescription>
          Choose how to turn it into a file. The file downloads when the export
          finishes.
        </DialogDescription>
      </DialogHeader>
      <div className="mt-4 flex flex-col gap-2">
        {loading && exporters.length === 0 && (
          <div className="text-muted-foreground text-sm">Looking for exporters…</div>
        )}
        {!loading && exporters.length === 0 && (
          <div className="text-muted-foreground text-sm">
            Nothing can export a {smartRegistry.getDisplayName(props.structure.identifier)} to
            a file yet.
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
              <span className="text-muted-foreground text-sm">{exporter.description}</span>
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
  structure: Structure;
  label: string;
  onBack: () => void;
}) => {
  const { assign, action } = useAction({ id: props.actionId });
  const { closeDialog } = useDialog();
  const { registry } = useWidgetRegistry();
  const addPendingHook = usePendingHooksStore((s) => s.addPendingHook);

  // Preset (and hide) every arg that expects the structure being exported.
  const preset =
    action?.args
      .filter((arg) => arg.identifier === props.structure.identifier)
      .reduce<Record<string, unknown>>((acc, arg) => {
        acc[arg.key] = props.structure.id;
        return acc;
      }, {}) ?? {};

  // ArgsContainer hides fields by key -> true, while usePortForm seeds their
  // values via `overwrites`.
  const hidden = Object.keys(preset).reduce<{ [key: string]: boolean }>((acc, key) => {
    acc[key] = true;
    return acc;
  }, {});

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
        hookType: FILE_DOWNLOAD_HOOK,
        params: {
          name: props.label,
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
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={props.onBack} type="button">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <DialogTitle>{action?.name || props.exporterName}</DialogTitle>
        </div>
      </DialogHeader>
      <DialogDescription className="mt-2" asChild>
        <div>
          {action?.description && (
            <FormActionDescription description={action.description} control={form.control} />
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-6">
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
