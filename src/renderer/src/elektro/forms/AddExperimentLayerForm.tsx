import { Guard } from "@/app/Arkitekt";
import { useDialog } from "@/app/dialog";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import {
  useCreateAnnotationLayerMutation,
  useCreateEventsLayerMutation,
  useCreateSpikesLayerMutation,
  useCreateTraceLayerMutation,
  useLayerPickerAnnotationCollectionsQuery,
  useLayerPickerArrayDatasetsQuery,
  useLayerPickerSparseDatasetsQuery,
  useLayerPickerTableDatasetsQuery,
} from "../api/graphql";

export type AddExperimentLayerFormProps = { experiment: string };

type Kind = "trace" | "spikes" | "events" | "annotation";

const KINDS: { value: Kind; label: string; hint: string }[] = [
  { value: "trace", label: "Trace", hint: "An array dataset — a recording or a stimulus — drawn as lines." },
  { value: "spikes", label: "Spikes", hint: "A sparse (unit × time) dataset drawn as a raster." },
  { value: "events", label: "Events", hint: "A table of times (and optional stops, labels, lanes)." },
  { value: "annotation", label: "Annotations", hint: "A collection of events and epochs." },
];

/**
 * Add a layer to an experiment: pick what kind, pick the data, create.
 *
 * Opened by id from the dialog registry (`addexperimentlayer`) — from the "+"
 * in the Layers tab and from the `@elektro/experiment` local action. Only data
 * that can be drawn on a timeline is offered (`timed` sparse and table
 * datasets); a new layer lands where its placement puts it, and an
 * UNREGISTERED one is fixed from its card.
 *
 * Guarded from the OUTSIDE: the dialog provider guards Rekuest, not Elektro,
 * and the pickers below query elektro on mount.
 */
export const AddExperimentLayerForm = (props: AddExperimentLayerFormProps) => (
  <Guard.Elektro unavailable={<div className="p-4 text-sm">Elektro is not available.</div>}>
    <AddExperimentLayer {...props} />
  </Guard.Elektro>
);

const AddExperimentLayer = ({ experiment }: AddExperimentLayerFormProps) => {
  const { closeDialog } = useDialog();
  const [kind, setKind] = useState<Kind>("trace");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const debounced = useDebounce(search, 250);
  const variables = { search: debounced || null, pagination: { limit: 30 } };
  const refetch = { refetchQueries: ["GetExperimentScene"] };

  const arrays = useLayerPickerArrayDatasetsQuery({ variables, skip: kind !== "trace" });
  const sparse = useLayerPickerSparseDatasetsQuery({ variables, skip: kind !== "spikes" });
  const tables = useLayerPickerTableDatasetsQuery({ variables, skip: kind !== "events" });
  const collections = useLayerPickerAnnotationCollectionsQuery({ variables, skip: kind !== "annotation" });

  const [createTrace, trace] = useCreateTraceLayerMutation(refetch);
  const [createSpikes, spikes] = useCreateSpikesLayerMutation(refetch);
  const [createEvents, events] = useCreateEventsLayerMutation(refetch);
  const [createAnnotation, annotation] = useCreateAnnotationLayerMutation(refetch);
  const creating = trace.loading || spikes.loading || events.loading || annotation.loading;

  const items: { id: string; name: string; detail: string | null }[] =
    kind === "trace"
      ? (arrays.data?.arrayDatasets ?? []).map((d) => ({
          id: d.id,
          name: d.name,
          detail: [d.axisNames.join("×"), d.valueUnit].filter(Boolean).join(" · "),
        }))
      : kind === "spikes"
        ? (sparse.data?.sparseDatasets ?? []).map((d) => ({
            id: d.id,
            name: d.name,
            detail: d.axisNames.map((a, i) => `${a} ${d.shape[i] ?? "?"}`).join(" × "),
          }))
        : kind === "events"
          ? (tables.data?.tableDatasets ?? []).map((d) => ({ id: d.id, name: d.name, detail: d.axisNames.join(", ") }))
          : (collections.data?.annotationCollections ?? []).map((d) => ({ id: d.id, name: d.name, detail: null }));

  const loading = [arrays, sparse, tables, collections].some((q) => q.loading);

  const create = async (id: string | null = picked) => {
    if (!id) return;
    try {
      if (kind === "trace") await createTrace({ variables: { input: { experiment, dataset: id } } });
      if (kind === "spikes") await createSpikes({ variables: { input: { experiment, sparseDataset: id } } });
      if (kind === "events") await createEvents({ variables: { input: { experiment, tableDataset: id } } });
      if (kind === "annotation") {
        await createAnnotation({ variables: { input: { experiment, annotationCollection: id } } });
      }
      toast.success("Layer added");
      closeDialog();
    } catch (error) {
      toast.error(`Could not add the layer: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <DialogHeader>
        <DialogTitle>Add a layer</DialogTitle>
        <DialogDescription>{KINDS.find((k) => k.value === kind)?.hint}</DialogDescription>
      </DialogHeader>
      <div className="flex gap-1">
        {KINDS.map((k) => (
          <Button
            key={k.value}
            size="sm"
            variant={kind === k.value ? "secondary" : "ghost"}
            onClick={() => {
              setKind(k.value);
              setPicked(null);
            }}
          >
            {k.label}
          </Button>
        ))}
      </div>
      <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="flex max-h-72 min-h-24 flex-col gap-1 overflow-y-auto">
        {items.length === 0 && (
          <div className="p-3 text-xs text-muted-foreground">
            {loading ? "Loading…" : "Nothing to add of this kind."}
          </div>
        )}
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPicked(item.id)}
            onDoubleClick={() => {
              setPicked(item.id);
              void create(item.id);
            }}
            className={cn(
              "flex flex-col rounded-md border px-2 py-1.5 text-left transition-colors hover:bg-accent/50",
              picked === item.id ? "border-foreground/60 bg-accent" : "border-border/60",
            )}
          >
            <span className="truncate text-sm">{item.name}</span>
            {item.detail && <span className="truncate font-mono text-[10px] text-muted-foreground">{item.detail}</span>}
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={closeDialog}>
          Cancel
        </Button>
        <Button disabled={!picked || creating} onClick={() => void create()}>
          {creating ? "Adding…" : "Add layer"}
        </Button>
      </div>
    </div>
  );
};
