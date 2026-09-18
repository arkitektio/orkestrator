import { Guard } from "@/app/Arkitekt";
import { useDialog } from "@/app/dialog";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useClockPickerQuery,
  useCreateClockOffsetMutation,
  useCreateSamplingLawMutation,
  usePlacementContextQuery,
} from "../api/graphql";

export type PlaceExperimentLayerFormProps = {
  /** The layer's data's own system (a dataset's intrinsic grid, a table's system). */
  source: string;
  /** The experiment's world. */
  world: string;
  worldName?: string | null;
  label: string;
};

const hasTime = (system: { axes: { type?: string | null }[] }) => system.axes.some((a) => a.type === "TIME");

/**
 * Put an UNREGISTERED layer on the timeline, by authoring the ONE edge that is
 * missing — never by moving the layer itself (placement lives in the coordinate
 * graph, not on layers).
 *
 *  - The data is timed on a clock that is not placed in this world → a CLOCK
 *    OFFSET from that clock onto the world. That edge moves EVERY layer timed on
 *    the clock, which is the point (a run's recordings move together) and is
 *    said before it is written.
 *  - The data is not timed at all → a SAMPLING LAW from its grid onto a clock
 *    (the world itself, or any clock): a rate and a start.
 *
 * Guarded from the outside, like every elektro dialog: the dialog provider
 * guards Rekuest, and these queries run on mount.
 */
export const PlaceExperimentLayerForm = (props: PlaceExperimentLayerFormProps) => (
  <Guard.Elektro unavailable={<div className="p-4 text-sm">Elektro is not available.</div>}>
    <PlaceExperimentLayer {...props} />
  </Guard.Elektro>
);

const PlaceExperimentLayer = ({ source, world, worldName, label }: PlaceExperimentLayerFormProps) => {
  const { closeDialog } = useDialog();
  const context = usePlacementContextQuery({ variables: { system: source } });
  const refetch = { refetchQueries: ["GetExperimentScene"] };
  const [createOffset, offsetState] = useCreateClockOffsetMutation(refetch);
  const [createLaw, lawState] = useCreateSamplingLawMutation(refetch);

  // Clocks the data is already timed on (edges out of its own system).
  const reachedClocks = useMemo(
    () =>
      (context.data?.coordinateSystem.registrations ?? [])
        .filter((edge) => edge.input?.id === source && edge.output && edge.output.id !== world && hasTime(edge.output))
        .map((edge) => edge.output!),
    [context.data, source, world],
  );

  const [mode, setMode] = useState<"offset" | "law">("law");
  useEffect(() => {
    if (reachedClocks.length > 0) setMode("offset");
  }, [reachedClocks.length]);

  // --- offset ---
  const [clock, setClock] = useState<string | null>(null);
  const offsetClock = clock ?? reachedClocks[0]?.id ?? null;
  const [offset, setOffset] = useState("0 s");

  // --- sampling law ---
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 250);
  const clocks = useClockPickerQuery({ variables: { search: debounced || null, pagination: { limit: 30 } }, skip: mode !== "law" });
  const clockOptions = useMemo(
    () => [
      { id: world, name: `${worldName ?? "World"} (this experiment's clock)` },
      ...(clocks.data?.coordinateSystems ?? []).filter((c) => c.id !== world && c.id !== source && hasTime(c)),
    ],
    [clocks.data, world, worldName, source],
  );
  const [lawClock, setLawClock] = useState<string>(world);
  const [rate, setRate] = useState("");
  const [tStart, setTStart] = useState("0 s");

  const submit = async () => {
    try {
      if (mode === "offset") {
        if (!offsetClock) return;
        await createOffset({ variables: { input: { clock: offsetClock, onto: world, offset } } });
      } else {
        await createLaw({ variables: { input: { source, clock: lawClock, samplingRate: rate, tStart } } });
      }
      toast.success("Placement written — the layer reconciles in place");
      closeDialog();
    } catch (error) {
      toast.error(`Could not place the layer: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const busy = offsetState.loading || lawState.loading;
  const offsetClockName = reachedClocks.find((c) => c.id === offsetClock)?.name ?? "that clock";

  return (
    <div className="flex flex-col gap-3">
      <DialogHeader>
        <DialogTitle>Place “{label}” on the timeline</DialogTitle>
        <DialogDescription>
          Nothing relates this layer's data to the experiment's clock yet. Author the missing edge.
        </DialogDescription>
      </DialogHeader>

      <div className="flex gap-1">
        <Button size="sm" variant={mode === "offset" ? "secondary" : "ghost"} onClick={() => setMode("offset")} disabled={reachedClocks.length === 0}>
          Place its clock in the world
        </Button>
        <Button size="sm" variant={mode === "law" ? "secondary" : "ghost"} onClick={() => setMode("law")}>
          Time it on a clock
        </Button>
      </div>

      {mode === "offset" ? (
        <div className="flex flex-col gap-2 text-sm">
          {reachedClocks.length > 1 && (
            <select
              className="h-8 rounded border border-border/60 bg-transparent px-2 text-sm"
              value={offsetClock ?? ""}
              onChange={(e) => setClock(e.currentTarget.value)}
            >
              {reachedClocks.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              Where {offsetClockName}'s zero falls on {worldName ?? "the world"}
            </span>
            <Input value={offset} onChange={(e) => setOffset(e.target.value)} placeholder="e.g. 12.5 s" />
          </label>
          <p className="text-xs text-amber-500">
            This offset places the whole clock: every layer timed on {offsetClockName} moves with it.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 text-sm">
          <Input placeholder="Search clocks…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
            {clockOptions.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setLawClock(c.id)}
                className={cn(
                  "rounded-md border px-2 py-1 text-left text-xs",
                  lawClock === c.id ? "border-foreground/60 bg-accent" : "border-border/60",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs text-muted-foreground">Sampling rate</span>
              <Input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 20 kHz" />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs text-muted-foreground">First sample at</span>
              <Input value={tStart} onChange={(e) => setTStart(e.target.value)} placeholder="0 s" />
            </label>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={closeDialog}>
          Cancel
        </Button>
        <Button
          disabled={busy || (mode === "offset" ? !offsetClock || !offset.trim() : !rate.trim())}
          onClick={() => void submit()}
        >
          {busy ? "Writing…" : mode === "offset" ? "Place clock" : "Time it"}
        </Button>
      </div>
    </div>
  );
};
