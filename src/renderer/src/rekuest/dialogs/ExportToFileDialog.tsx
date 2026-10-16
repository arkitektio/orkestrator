import { Button } from "@/core/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { usePendingHooksStore } from "@/core/modules/taskhooks/pendingHooksStore";
import { smartRegistry } from "@/core/smart/registry";
import {
  ActionFilter,
  DemandKind,
  PortKind,
  useAllPrimaryActionsQuery,
  useDetailActionQuery,
} from "@/rekuest/api/graphql";
import { Structure } from "@/core/types";
import { ArrowLeft, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "@/core/notify";

import { FILE_DOWNLOADERS } from "@/core/modules/registries";
import { structureLabel } from "@/core/modules/export/structureLabel";
import { FILE_DOWNLOAD_HOOK } from "@/core/modules/export/taskHooks";
import { AssignForm } from "../forms/assign/AssignForm";

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
  // The same query the form runs: answered from the cache.
  const { data } = useDetailActionQuery({ variables: { id: props.actionId } });
  const addPendingHook = usePendingHooksStore((s) => s.addPendingHook);

  // Preset (and hide) every arg that expects the structure being exported.
  const preset = useMemo(
    () =>
      data?.action.args
        .filter((arg) => arg.identifier === props.structure.identifier)
        .reduce<Record<string, unknown>>((acc, arg) => {
          acc[arg.key] = props.structure.id;
          return acc;
        }, {}),
    [data?.action.args, props.structure],
  );

  return (
    <AssignForm
      target={{ action: props.actionId }}
      args={preset}
      hidden={preset}
      prefillLatest={false}
      leading={
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={props.onBack} type="button">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      }
      submitLabel={
        <>
          <Download className="h-4 w-4" />
          Export
        </>
      }
      onAssigned={(task, reference) => {
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
      }}
    />
  );
};
