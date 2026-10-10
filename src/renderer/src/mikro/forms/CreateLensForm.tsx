import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { useDialog } from "@/core/dialogs/registry";
import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { MikroLens } from "@/core/linkers";
import { toast } from "@/core/notify";
import { Button } from "@/core/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { Slider } from "@/core/ui/slider";
import type { DocumentNode } from "graphql";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMikro } from "../api/funcs";
import {
  CreateAnnotationLensDocument,
  CreateMeshLensDocument,
  CreateNetworkLensDocument,
  CreateSparseLensDocument,
  CreateTableLensDocument,
  ListLensesDocument,
  UpdateLensDocument,
  useCreateListLensMutation,
  useGetListArrayDatasetQuery,
  useGetWholeLensQuery,
  useGetWindowLensSubjectQuery,
  type LensFilter,
  type WindowLensSubjectFragment,
} from "../api/graphql";
import {
  draftsFor,
  WindowEditor,
  windowsFromDrafts,
  type WindowDraft,
} from "../components/lens/WindowEditor";
import { describeLens, lensLabel, windowSummary, type LensContainerRef } from "../lenses";

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

const Loading = () => <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

/**
 * One of: a container to cut starting at the whole of it (`dataset` for an
 * array, `tableDataset`, `meshCollection`, … for the window-selected kinds), or
 * a `lens` of any kind whose container is cut again starting at its selection.
 */
export type CreateLensProps = LensContainerRef & { lens?: string };

/**
 * Cut a lens out of a container by hand.
 *
 * An array is cut by one index range per axis; a table, a sparse dataset, a
 * mesh, a network or an annotation collection by windows — inclusive ranges in
 * the space it lives in. Opened from a container it starts at the whole of it;
 * opened from a lens it starts at that lens' selection, for a tighter cut of
 * the same data — the new lens is still a selection of the CONTAINER, in the
 * container's own terms.
 *
 * The server hands back the existing lens when the container already has one
 * with this selection, so this never mints a duplicate, and either way the
 * result is the lens to open.
 */
export const CreateLensForm = (props: CreateLensProps) => {
  if (props.lens) return <FromLens lens={props.lens} />;
  if (props.dataset) return <FromArrayDataset dataset={props.dataset} />;

  const { lens: _lens, dataset: _dataset, ...container } = props;
  return Object.values(container).some(Boolean) ? <FromContainer filters={container} /> : null;
};

const FromArrayDataset = ({ dataset: id }: { dataset: string }) => {
  const { data, error, refetch } = useGetListArrayDatasetQuery({ variables: { id } });

  if (error) return <QueryError error={error} onRetry={() => refetch()} />;
  if (!data) return <Loading />;

  const dataset = data.arrayDataset;
  return (
    <CreateLensFields
      subject={{
        datasetId: dataset.id,
        name: dataset.name,
        axisNames: dataset.axisNames,
        shape: dataset.shape,
        initial: dataset.axisNames.map((_, index): Range => [0, dataset.shape[index] ?? 0]),
      }}
    />
  );
};

/** The kind is read off the lens: its container decides which form this is. */
const FromLens = ({ lens: id }: { lens: string }) => {
  const { data, error, refetch } = useGetWindowLensSubjectQuery({ variables: { id } });

  if (error) return <QueryError error={error} onRetry={() => refetch()} />;
  if (!data) return <Loading />;

  const lens = data.lens;
  if (lens.__typename !== "ArrayLens") return <CreateWindowLensFields lens={lens} />;

  const dataset = lens.dataset;
  return (
    <CreateLensFields
      subject={{
        datasetId: dataset.id,
        name: dataset.name,
        axisNames: dataset.axisNames,
        shape: dataset.shape,
        initial: dataset.axisNames.map((axis, index): Range => {
          const slice = lens.slices.find((candidate) => candidate.axis === axis);
          return [slice?.start ?? 0, slice?.stop ?? dataset.shape[index] ?? 0];
        }),
      }}
    />
  );
};

/** A container holding only its id reaches its whole lens first: one query. */
const FromContainer = ({ filters }: { filters: LensFilter }) => {
  const { data, error, refetch } = useGetWholeLensQuery({
    variables: { filters: { ...filters, sliced: false } },
  });

  if (error) return <QueryError error={error} onRetry={() => refetch()} />;
  if (!data) return <Loading />;

  const whole = data.lenses.at(0);
  if (!whole || whole.__typename === "ArrayLens") {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        This container has no lens to cut from.
      </div>
    );
  }
  return <CreateWindowLensFields lens={whole} />;
};

type WindowLens = Exclude<WindowLensSubjectFragment, { __typename: "ArrayLens" }>;

/** The create mutation of each window-selected kind, and where its answer is. */
const CREATE_WINDOW_LENS: Record<
  WindowLens["__typename"],
  { document: DocumentNode; field: string }
> = {
  TableLens: { document: CreateTableLensDocument, field: "createTableLens" },
  SparseLens: { document: CreateSparseLensDocument, field: "createSparseLens" },
  MeshLens: { document: CreateMeshLensDocument, field: "createMeshLens" },
  NetworkLens: { document: CreateNetworkLensDocument, field: "createNetworkLens" },
  AnnotationLens: { document: CreateAnnotationLensDocument, field: "createAnnotationLens" },
};

/**
 * The window form, for every kind but an array.
 *
 * `lens` is where it starts: the container's whole lens, or the windowed lens
 * being cut again. What is sent is always the CONTAINER and the full set of
 * windows, never "this lens, narrowed": the windows on screen are already the
 * complete selection, and stating it against the container is the one spelling
 * the server documents.
 */
const CreateWindowLensFields = ({ lens }: { lens: WindowLens }) => {
  const navigate = useNavigate();
  const client = useMikro();
  const { closeDialog } = useDialog();
  const { info, container } = describeLens(lens);

  // The axes of the space the windows are stated in. A container whose space
  // the client cannot read leaves the axis to be typed.
  const axes = (lens.coordinateSystem?.axes ?? []).map((axis) => axis.name);
  const fixedAxes = axes.length > 0;
  const [drafts, setDrafts] = useState<WindowDraft[]>(() => draftsFor(axes, lens.windows));
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const windows = windowsFromDrafts(drafts);
  const whole = windows.length === 0;

  const submit = async () => {
    const { document, field } = CREATE_WINDOW_LENS[lens.__typename];
    setBusy(true);
    try {
      const result = await client.mutate<Record<string, { id: string; name?: string | null }>>({
        mutation: document,
        variables: { input: { [info.filterKey]: container.id, windows } },
      });
      const created = result.data?.[field];
      if (!created) throw new Error("The server answered with no lens");

      // None of these inputs takes a name, so naming is a second call — and
      // only for a lens that has none: asking for a selection that already
      // exists hands back that lens, and its name is somebody's choice.
      const label = name.trim();
      if (label && !whole && !created.name) {
        await client.mutate({
          mutation: UpdateLensDocument,
          variables: { id: created.id, name: label },
        });
      }
      // The lists showing this container's lenses hold one more now.
      client.refetchQueries({ include: [ListLensesDocument] });
      toast.success("Lens ready");
      closeDialog();
      navigate(MikroLens.linkBuilder(created.id));
    } catch (error) {
      toast.error(`Error: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <DialogHeader>
        <DialogTitle>New {info.label.toLowerCase()}</DialogTitle>
        <DialogDescription>
          Keep part of {container.name}: a range along any axis, either side left
          empty to stay open. The lens can be opened in a scene of its own and
          handed to a task in place of the whole {info.container.toLowerCase()}.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3 py-4">
        <Input
          aria-label="Lens name"
          placeholder="Name (optional), e.g. first ten minutes"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <WindowEditor drafts={drafts} onChange={setDrafts} fixedAxes={fixedAxes} />
      </div>

      <div className="font-mono text-xs text-muted-foreground">
        {whole ? info.whole : windowSummary(windows)}
      </div>

      <DialogFooter>
        <Button type="submit" disabled={busy}>
          {whole
            ? `Open ${info.whole.toLowerCase()}`
            : busy
              ? "Creating…"
              : "Create lens"}
        </Button>
      </DialogFooter>
    </form>
  );
};

const CreateLensFields = ({ subject }: { subject: Subject }) => {
  const navigate = useNavigate();
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
        submit({
          variables: {
            // The name labels a lens this creates. If the dataset already has
            // one with these slices the server hands that one back as it is —
            // which is also what happens when nothing is cut: no slices is the
            // whole array, and the answer is the dataset's full lens to open.
            input: {
              dataset: subject.datasetId,
              slices,
              name: slices.length ? name.trim() || undefined : undefined,
            },
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
