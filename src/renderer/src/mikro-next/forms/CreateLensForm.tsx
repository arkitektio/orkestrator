import { Guard } from "@/app/Arkitekt";
import { useGraphQLDialog } from "@/app/hooks/useGraphQLDialog";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { linkBuilder } from "@/providers/smart/builder";
import { useCreateLensMutation, useGetArrayDatasetQuery } from "../api/graphql";
import { lensLabel, SliceDraft, slicesFromDrafts } from "../lenses";

const BLANK: SliceDraft = { start: "", stop: "", step: "" };

/**
 * Cut a new lens out of a dataset: one row per axis, each optionally bounded.
 * Rows left alone select the whole axis, so submitting an untouched form makes
 * the full lens. The preview line is the same `lensLabel` every other surface
 * shows, so what you type here is what the lens will be called everywhere.
 */
const CreateLensFormInner = (props: { dataset: string }) => {
  const navigate = useNavigate();
  const { data } = useGetArrayDatasetQuery({ variables: { id: props.dataset } });
  const [drafts, setDrafts] = useState<Record<string, SliceDraft>>({});

  const [createLens] = useCreateLensMutation({
    refetchQueries: ["GetLenses", "GetArrayDatasetDerived"],
  });
  const submit = useGraphQLDialog(createLens, {
    successMessage: "Lens created",
    onSuccess: (result) => {
      if (result?.createLens) navigate(linkBuilder("mikro/lenses")(result.createLens.id));
    },
  });

  const dataset = data?.arrayDataset;
  const result = useMemo(
    () => (dataset ? slicesFromDrafts(dataset.axisNames, dataset.shape, drafts) : null),
    [dataset, drafts],
  );

  if (!dataset || !result) {
    return <div className="text-sm text-muted-foreground">Loading dataset…</div>;
  }

  const setBound = (axis: string, bound: keyof SliceDraft, value: string) =>
    setDrafts((prev) => ({ ...prev, [axis]: { ...(prev[axis] ?? BLANK), [bound]: value } }));

  // The preview needs the lens' OWN shape, which is the dataset's with each cut
  // axis narrowed; computed here only to label, the server is the authority.
  const preview = result.ok
    ? lensLabel({
        axisNames: dataset.axisNames,
        shape: dataset.shape.map((extent, index) => {
          const slice = result.slices.find((s) => s.axis === dataset.axisNames[index]);
          if (!slice) return extent;
          const span = (slice.stop ?? extent) - (slice.start ?? 0);
          return Math.ceil(span / (slice.step ?? 1));
        }),
        slices: result.slices,
      })
    : null;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!result.ok) return;
        submit({ variables: { input: { dataset: dataset.id, slices: result.slices } } });
      }}
    >
      <DialogHeader>
        <DialogTitle>New lens</DialogTitle>
        <DialogDescription>
          A selection over "{dataset.name}". Leave an axis empty to keep all of it.
        </DialogDescription>
      </DialogHeader>

      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="text-left">
            <th className="py-1 font-normal">Axis</th>
            <th className="py-1 font-normal">Start</th>
            <th className="py-1 font-normal">Stop</th>
            <th className="py-1 font-normal">Step</th>
          </tr>
        </thead>
        <tbody>
          {dataset.axisNames.map((axis, index) => {
            const draft = drafts[axis] ?? BLANK;
            const error = !result.ok ? result.errors[axis] : undefined;
            return (
              <tr key={axis} className="border-t border-border/40 align-top">
                <td className="py-1.5 pr-2 font-mono">
                  {axis}
                  <div className="text-[0.625rem] text-muted-foreground">
                    {dataset.shape[index]}
                  </div>
                </td>
                {(["start", "stop", "step"] as const).map((bound) => (
                  <td key={bound} className="py-1.5 pr-2">
                    <Input
                      inputMode="numeric"
                      className="h-8 font-mono"
                      placeholder={
                        bound === "start" ? "0" : bound === "stop" ? String(dataset.shape[index]) : "1"
                      }
                      value={draft[bound]}
                      onChange={(event) => setBound(axis, bound, event.target.value)}
                    />
                  </td>
                ))}
                <td className="py-1.5 text-xs text-destructive">{error}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {preview && <div className="font-mono text-xs text-muted-foreground">{preview}</div>}

      <DialogFooter>
        <Button type="submit" disabled={!result.ok}>
          Create lens
        </Button>
      </DialogFooter>
    </form>
  );
};

// Outer guard: the dataset query fires on mount (CLAUDE.md §1).
export const CreateLensForm = (props: { dataset: string }) => (
  <Guard.Mikro>
    <CreateLensFormInner {...props} />
  </Guard.Mikro>
);
