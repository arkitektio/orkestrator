import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { useDialog } from "@/core/dialogs/registry";
import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { MikroArrayDataset, MikroLens } from "@/core/linkers";
import { Button } from "@/core/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { Slider } from "@/core/ui/slider";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useCreateListLensMutation,
  useGetLensQuery,
  useGetListArrayDatasetQuery,
} from "../api/graphql";
import { lensLabel } from "../lenses";

type Range = readonly [start: number, stop: number];

type Subject = {
  datasetId: string;
  name: string;
  axisNames: readonly string[];
  shape: readonly number[];
  /** Where the ranges start: the whole array, or the slices of the lens cut again. */
  initial: readonly Range[];
};

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

/**
 * Cut a lens out of a dataset by hand: one range per axis.
 *
 * Opened from a dataset it starts at the whole array; opened from a lens it
 * starts at that lens' slices, for a tighter cut of the same data — the new lens
 * is still a selection of the DATASET, in the dataset's own indices, because a
 * lens of a lens is not a thing the model has.
 *
 * The server hands back the existing lens when the dataset already has one with
 * these slices, so this never mints a duplicate, and either way the result is
 * the lens to open.
 */
export const CreateLensForm = (props: { dataset?: string; lens?: string }) => {
  const datasetQuery = useGetListArrayDatasetQuery({
    variables: { id: props.dataset as string },
    skip: !props.dataset,
  });
  const lensQuery = useGetLensQuery({
    variables: { id: props.lens as string },
    skip: !props.lens,
  });

  const error = datasetQuery.error ?? lensQuery.error;
  if (error) {
    return (
      <QueryError
        error={error}
        onRetry={() => (props.lens ? lensQuery.refetch() : datasetQuery.refetch())}
      />
    );
  }

  const lens = lensQuery.data?.lens;
  const dataset = lens?.dataset ?? datasetQuery.data?.arrayDataset;
  if (!dataset) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  const initial = dataset.axisNames.map((axis, index): Range => {
    const size = dataset.shape[index] ?? 0;
    const slice = lens?.slices.find((candidate) => candidate.axis === axis);
    return [slice?.start ?? 0, slice?.stop ?? size];
  });

  return (
    <CreateLensFields
      subject={{
        datasetId: dataset.id,
        name: dataset.name,
        axisNames: dataset.axisNames,
        shape: dataset.shape,
        initial,
      }}
    />
  );
};

const CreateLensFields = ({ subject }: { subject: Subject }) => {
  const navigate = useNavigate();
  const { closeDialog } = useDialog();
  const [ranges, setRanges] = useState<readonly Range[]>(subject.initial);
  const [name, setName] = useState("");

  const [createLens, { loading }] = useCreateListLensMutation({
    // The dataset's page lists its lenses; the new one belongs in that rail.
    refetchQueries: ["GetArrayDataset"],
  });
  const submit = useGraphQLDialog(createLens, {
    successMessage: "Lens ready",
    onSuccess: (data) => {
      if (data?.createLens) navigate(MikroLens.linkBuilder(data.createLens.id));
    },
  });

  const setRange = (index: number, range: Range) =>
    setRanges((previous) => previous.map((old, i) => (i === index ? range : old)));

  // Only the axes that are actually cut. An axis left at its full extent is one
  // the lens says nothing about — exactly what the absence of a slice means.
  const slices = subject.axisNames.flatMap((axis, index) => {
    const [start, stop] = ranges[index];
    return start === 0 && stop === subject.shape[index] ? [] : [{ axis, start, stop }];
  });
  const shape = ranges.map(([start, stop]) => stop - start);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (slices.length === 0) {
          // Nothing is cut, so this is the whole array: the dataset's own page,
          // not a new lens.
          closeDialog();
          navigate(MikroArrayDataset.linkBuilder(subject.datasetId));
          return;
        }
        submit({
          variables: {
            // The name labels a lens this creates. If the dataset already has
            // one with these slices the server hands that one back as it is.
            input: { dataset: subject.datasetId, slices, name: name.trim() || undefined },
          },
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>New lens</DialogTitle>
        <DialogDescription>
          Select part of {subject.name} along each axis. The lens can be opened
          in a scene of its own and handed to a task in place of the whole
          array.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3 py-4">
        <Input
          aria-label="Lens name"
          placeholder="Name (optional), e.g. nucleus 3"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        {subject.axisNames.map((axis, index) => {
          const size = subject.shape[index] ?? 0;
          const [start, stop] = ranges[index];
          return (
            <div key={axis} className="grid grid-cols-[2rem_4.5rem_minmax(0,1fr)_4.5rem_4rem] items-center gap-2">
              <span className="font-mono text-sm">{axis}</span>
              <Input
                type="number"
                aria-label={`${axis} start`}
                className="h-8 font-mono text-xs"
                min={0}
                max={stop - 1}
                value={start}
                onChange={(event) =>
                  setRange(index, [clamp(Number(event.target.value) || 0, 0, stop - 1), stop])
                }
              />
              {/* Half-open like the slices it writes: [start, stop). The
                  thumbs may not meet, so a lens always keeps at least one
                  position on every axis. */}
              <Slider
                min={0}
                max={size}
                step={1}
                minStepsBetweenThumbs={1}
                value={[start, stop]}
                disabled={size <= 1}
                onValueChange={([low, high]) => setRange(index, [low, high])}
              />
              <Input
                type="number"
                aria-label={`${axis} stop`}
                className="h-8 font-mono text-xs"
                min={start + 1}
                max={size}
                value={stop}
                onChange={(event) =>
                  setRange(index, [start, clamp(Number(event.target.value) || 0, start + 1, size)])
                }
              />
              <span className="font-mono text-xs text-muted-foreground">of {size}</span>
            </div>
          );
        })}
      </div>

      <div className="font-mono text-xs text-muted-foreground">
        {lensLabel({ axisNames: subject.axisNames, shape, slices })}
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {slices.length === 0
            ? "Open whole array"
            : loading
              ? "Creating…"
              : "Create lens"}
        </Button>
      </DialogFooter>
    </form>
  );
};
