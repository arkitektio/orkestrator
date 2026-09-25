import { Guard } from "@/app/Arkitekt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  CoordinateSystemFragment,
  useCoordinateSystemOptionsLazyQuery,
  useGetDatasetSystemsQuery,
  useGetRegistrationSystemsQuery,
  useGetTableDatasetSystemQuery,
  useRegisterSourceCandidatesQuery,
} from "../api/graphql";
import { residentLabel } from "../components/coordinates/residents";
import { RegisterEdgeForm } from "./registration/RegisterEdgeForm";

/**
 * Register a source into a coordinate system: author one edge of the
 * coordinate graph.
 *
 * Three entry points, two independently-optional slots. The step is DERIVED
 * from which slots are filled rather than stored, so a prefilled drag and a
 * cold-start pick share one code path:
 *
 *   { target, source } — drag a dataset onto a system
 *   { target }         — "Register…" from a coordinate system's page
 *   { source }         — "Register into…" from a dataset's page
 */

/** A thing that can be registered. A container resolves to one of ITS systems. */
export type RegisterSourceRef =
  | { kind: "coordinatesystem"; id: string }
  | { kind: "arrayDataset"; id: string }
  | { kind: "tabledataset"; id: string };

export type RegisterFormProps = {
  target?: string;
  source?: RegisterSourceRef;
};

const PickerRow = (props: {
  name: string;
  secondary?: string | null;
  badge?: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={props.onClick}
    className="flex w-full items-center justify-between gap-2 rounded border border-input p-2 text-left transition-colors hover:bg-accent"
  >
    <div className="min-w-0">
      <div className="truncate text-sm font-medium">{props.name}</div>
      {props.secondary && (
        <div className="truncate text-xs text-muted-foreground">
          {props.secondary}
        </div>
      )}
    </div>
    {props.badge && <Badge variant="outline">{props.badge}</Badge>}
  </button>
);

/** Step 1: what are we registering? */
const SourcePicker = (props: { onPick: (ref: RegisterSourceRef) => void }) => {
  const [search, setSearch] = useState("");
  const { data, loading } = useRegisterSourceCandidatesQuery({
    variables: { search: search || undefined },
  });

  const datasets = data?.arrayDatasets ?? [];
  const tables = data?.tableDatasets ?? [];

  return (
    <>
      <Input
        placeholder="Search datasets and tables…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto">
        <div className="flex flex-col gap-1">
          <div className="text-xs font-medium uppercase text-muted-foreground">
            Datasets
          </div>
          {datasets.map((dataset) => (
            <PickerRow
              key={dataset.id}
              name={dataset.name}
              onClick={() => props.onPick({ kind: "arrayDataset", id: dataset.id })}
            />
          ))}
          {!loading && !datasets.length && (
            <div className="text-xs text-muted-foreground">No datasets found</div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-xs font-medium uppercase text-muted-foreground">
            Tables
          </div>
          {tables.map((table) => (
            <PickerRow
              key={table.id}
              name={table.name}
              secondary={table.description}
              onClick={() =>
                props.onPick({ kind: "tabledataset", id: table.id })
              }
            />
          ))}
          {!loading && !tables.length && (
            <div className="text-xs text-muted-foreground">No tables found</div>
          )}
        </div>
      </div>
    </>
  );
};

/**
 * Step 2: WHICH space of the chosen dataset?
 *
 * Registering a dataset is ambiguous and the ambiguity matters: into a µm world
 * the intrinsic grid's scale IS the pixel size, while an existing calibration
 * is already in µm and its scale is 1. Getting this wrong produces a valid edge
 * that places the data wrongly, so the choice is shown rather than assumed —
 * but only when it IS a choice: one candidate auto-resolves.
 */
const DatasetSystemStep = (props: {
  dataset: string;
  onResolve: (system: CoordinateSystemFragment) => void;
  onBack?: () => void;
}) => {
  const { data, loading } = useGetDatasetSystemsQuery({
    variables: { dataset: props.dataset },
    onCompleted: (result) => {
      const systems = result.coordinateSystems;
      if (systems.length === 1) props.onResolve(systems[0]);
    },
  });

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading spaces…</div>;
  }

  const systems = data?.coordinateSystems ?? [];

  if (!systems.length) {
    return (
      <div className="text-sm text-muted-foreground">
        This dataset owns no coordinate system, so there is nothing to register.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-muted-foreground">
        Registering the pixel grid and registering a calibration are different
        claims: into a physical world the pixel grid&apos;s scale is the pixel
        size, while a calibration is already in physical units.
      </div>
      {systems.map((system) => (
        <PickerRow
          key={system.id}
          name={system.name}
          badge={residentLabel(system)}
          secondary={[...system.axes]
            .sort((a, b) => a.order - b.order)
            .map((axis) => `${axis.name}${axis.unit ? `: ${axis.unit}` : ""}`)
            .join(", ")}
          onClick={() => props.onResolve(system)}
        />
      ))}
      {props.onBack && (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={props.onBack}
        >
          Back
        </Button>
      )}
    </div>
  );
};

/** A table owns exactly one system, so this only ever resolves. */
const TableSystemStep = (props: {
  table: string;
  onResolve: (system: CoordinateSystemFragment) => void;
}) => {
  useGetTableDatasetSystemQuery({
    variables: { id: props.table },
    onCompleted: (result) => props.onResolve(result.tableDataset.coordinateSystem),
  });
  return <div className="text-sm text-muted-foreground">Loading space…</div>;
};

/** Step 3: which system are we registering INTO? */
const TargetPicker = (props: {
  excludeId?: string;
  onPick: (id: string) => void;
}) => {
  const [search, setSearch] = useState("");
  const [runSearch, { data, loading }] = useCoordinateSystemOptionsLazyQuery();

  // The options query is lazy (it is shaped for GraphQLSearchField), so drive
  // it from the search box directly.
  const options = (data?.options ?? []).filter(
    (option) => option.value !== props.excludeId,
  );

  return (
    <div className="flex flex-col gap-2">
      <Input
        placeholder="Search coordinate systems…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          runSearch({ variables: { search: e.target.value || undefined } });
        }}
        onFocus={() => runSearch({ variables: { search: search || undefined } })}
      />
      <div className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
        {options.map((option) => (
          <PickerRow
            key={option.value}
            name={option.label}
            onClick={() => props.onPick(option.value)}
          />
        ))}
        {!loading && !options.length && (
          <div className="text-xs text-muted-foreground">
            {search ? "No coordinate systems found" : "Search for a target space"}
          </div>
        )}
      </div>
    </div>
  );
};

/** Step 4: both endpoints known — fetch their axes together and map them. */
const EdgeStep = (props: {
  sourceSystemId: string;
  targetSystemId: string;
  sourceContext?: string | null;
  onBack?: () => void;
  onChangeSource?: () => void;
}) => {
  // One query for both endpoints: the prefill heuristic must see both systems
  // at once to tell an unambiguous type match from an ambiguous one.
  const { data, loading, error } = useGetRegistrationSystemsQuery({
    variables: { input: props.sourceSystemId, output: props.targetSystemId },
  });

  if (error) {
    return <div className="text-sm text-destructive">{error.message}</div>;
  }
  if (loading || !data) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading coordinate systems…
      </div>
    );
  }

  return (
    <RegisterEdgeForm
      source={data.input}
      target={data.output}
      sourceContext={props.sourceContext}
      onBack={props.onBack}
      onChangeSource={props.onChangeSource}
    />
  );
};

const RegisterFormInner = (props: RegisterFormProps) => {
  const [sourceRef, setSourceRef] = useState<RegisterSourceRef | null>(
    props.source ?? null,
  );
  const [sourceSystem, setSourceSystem] = useState<string | null>(
    props.source?.kind === "coordinatesystem" ? props.source.id : null,
  );
  const [sourceContext, setSourceContext] = useState<string | null>(null);
  const [targetSystem, setTargetSystem] = useState<string | null>(
    props.target ?? null,
  );

  // The entry point fixes a slot; back-navigation must not strand the user in
  // a step their entry point already answered. Note that a locked *source*
  // does not lock the SYSTEM choice — picking pixels vs. calibration stays the
  // user's unless the prop named a system outright.
  const sourceLocked = props.source !== undefined;
  const systemLocked = props.source?.kind === "coordinatesystem";
  const targetLocked = props.target !== undefined;

  const resolveSystem = (system: CoordinateSystemFragment) => {
    setSourceSystem(system.id);
    setSourceContext(system.name);
  };

  const step = !sourceRef
    ? "source"
    : !sourceSystem
      ? "sourcesystem"
      : !targetSystem
        ? "target"
        : "edge";

  return (
    <div className="flex flex-col gap-3">
      <DialogHeader>
        <DialogTitle>Register</DialogTitle>
        <DialogDescription>
          {step === "source"
            ? "Pick the data to register."
            : step === "sourcesystem"
              ? "Which space of this data are you registering?"
              : step === "target"
                ? "Pick the coordinate system to register into."
                : "Map the source's axes onto the target's, then say how they relate."}
        </DialogDescription>
      </DialogHeader>

      {step === "source" && (
        <SourcePicker
          onPick={(ref) => {
            setSourceRef(ref);
            if (ref.kind === "coordinatesystem") setSourceSystem(ref.id);
          }}
        />
      )}

      {step === "sourcesystem" && sourceRef?.kind === "arrayDataset" && (
        <DatasetSystemStep
          dataset={sourceRef.id}
          onResolve={resolveSystem}
          onBack={sourceLocked ? undefined : () => setSourceRef(null)}
        />
      )}

      {step === "sourcesystem" && sourceRef?.kind === "tabledataset" && (
        <TableSystemStep table={sourceRef.id} onResolve={resolveSystem} />
      )}

      {step === "target" && (
        <TargetPicker
          excludeId={sourceSystem ?? undefined}
          onPick={setTargetSystem}
        />
      )}

      {step === "edge" && sourceSystem && targetSystem && (
        <EdgeStep
          sourceSystemId={sourceSystem}
          targetSystemId={targetSystem}
          sourceContext={sourceContext}
          onBack={
            targetLocked
              ? undefined
              : () => {
                  setTargetSystem(null);
                }
          }
          onChangeSource={
            systemLocked
              ? undefined
              : () => {
                  setSourceSystem(null);
                  setSourceContext(null);
                  if (!sourceLocked) setSourceRef(null);
                }
          }
        />
      )}
    </div>
  );
};

// The mikro guard must wrap from the outside: the inner component's queries
// fire on mount, before any JSX-level guard could stop them (CLAUDE.md §1).
export const RegisterForm = (props: RegisterFormProps) => (
  <Guard.Mikro>
    <RegisterFormInner {...props} />
  </Guard.Mikro>
);

export default RegisterForm;
