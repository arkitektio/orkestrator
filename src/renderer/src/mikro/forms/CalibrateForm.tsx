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
import { AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import {
  AxisType,
  CreatableTransformKind,
  useCreateCoordinateSystemMutation,
  useGetArrayDatasetQuery,
} from "../api/graphql";
import {
  CalibrationRow,
  buildCalibrationInput,
  hasBlockingIssue,
  isMeasured,
  prefillCalibration,
  validateCalibration,
} from "./calibration/calibration";

/**
 * Calibrate a dataset: create the physical space its pixels map into.
 *
 * One `createCoordinateSystem` call makes two things — the physical coordinate
 * system (whose axes carry the units) and the single SCALE registration from
 * the intrinsic pixel grid into it. All the ordering discipline lives in
 * ./calibration/calibration.ts, which is pure and unit-tested; this file is the
 * table.
 */

const REFETCH = {
  refetchQueries: ["GetArrayDataset", "GetCoordinateSystem", "GetCoordinateGraph"],
  awaitRefetchQueries: true,
};

const CalibrateFormInner = (props: { dataset: string }) => {
  const { data, loading, error } = useGetArrayDatasetQuery({
    variables: { id: props.dataset },
  });

  if (error) return <div className="text-sm text-destructive">{error.message}</div>;
  if (loading || !data) {
    return <div className="text-sm text-muted-foreground">Loading dataset…</div>;
  }

  const intrinsic = data.arrayDataset.intrinsicSystem;
  if (!intrinsic) {
    return (
      <div className="text-sm text-muted-foreground">
        This dataset has no intrinsic pixel grid, so there is nothing to
        calibrate.
      </div>
    );
  }

  return (
    <CalibrateFormBody
      dataset={props.dataset}
      datasetName={data.arrayDataset.name}
      axes={intrinsic.axes}
    />
  );
};

const CalibrateFormBody = (props: {
  dataset: string;
  datasetName: string;
  axes: readonly { name: string; order: number; type: AxisType; longName?: string | null }[];
}) => {
  const [rows, setRows] = useState<CalibrationRow[]>(() =>
    prefillCalibration(props.axes),
  );
  const [name, setName] = useState("physical");

  const [create, { loading }] = useCreateCoordinateSystemMutation();
  const submit = useGraphQLDialog(create, {
    successMessage: "Calibrated",
    errorPrefix: "Could not calibrate",
  });

  const setRow = (index: number, patch: Partial<CalibrationRow>) =>
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );

  const draft = useMemo(
    () => ({ dataset: props.dataset, name, rows }),
    [props.dataset, name, rows],
  );
  const issues = useMemo(() => validateCalibration(draft), [draft]);
  const blocked = hasBlockingIssue(issues);

  const onSubmit = () => {
    // calibration.ts stays free of generated imports so its suite can run in
    // `node` (see the note at its head), so it types axis kinds and the
    // transform kind as plain strings. Widen them onto the real enums here —
    // the strings are exactly the enums' values, and this is the only place the
    // two type worlds meet.
    const built = buildCalibrationInput(draft);
    const input = {
      ...built,
      axes: built.axes.map((axis) => ({ ...axis, type: axis.type as AxisType })),
      registrations: built.registrations.map((registration) => ({
        ...registration,
        transform: {
          ...registration.transform,
          kind: registration.transform.kind as CreatableTransformKind,
        },
      })),
    };
    return submit({ variables: { input }, ...REFETCH });
  };

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Calibrate {props.datasetName}</DialogTitle>
        <DialogDescription>
          Create the physical space this dataset&apos;s pixels map into. The
          pixel size is how much of each axis&apos;s unit one step spans.
        </DialogDescription>
      </DialogHeader>

      {/* One row per intrinsic axis, in `order` — that order becomes both the
          new system's axis order and the scale order. See calibration.ts. */}
      <div className="overflow-x-auto rounded border border-input">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2 text-left font-medium">axis</th>
              <th className="p-2 text-left font-medium">unit</th>
              <th className="p-2 text-left font-medium">pixel size</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.axis.name} className="border-t border-input">
                <td className="p-2">
                  <span className="font-mono">{row.axis.name}</span>{" "}
                  <span className="text-xs text-muted-foreground">
                    {row.axis.type}
                  </span>
                </td>
                <td className="p-2">
                  <Input
                    className="h-8 w-32"
                    value={row.unit}
                    onChange={(e) => setRow(index, { unit: e.target.value })}
                  />
                </td>
                <td className="p-2">
                  <Input
                    className="h-8 w-32"
                    value={String(row.scale ?? "")}
                    onChange={(e) => setRow(index, { scale: e.target.value })}
                  />
                  {!isMeasured(row.axis) && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      indexes acquisitions, not positions
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {issues.length > 0 && (
        <div className="flex flex-col gap-1">
          {issues.map((issue, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 text-xs ${
                issue.level === "error"
                  ? "text-destructive"
                  : "text-amber-600 dark:text-amber-500"
              }`}
            >
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <div className="text-xs font-medium uppercase text-muted-foreground">
          Name
        </div>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
        <div className="text-xs text-muted-foreground">
          A dataset can have many calibrations; the name is how you tell them
          apart.
        </div>
      </div>

      <DialogFooter className="mt-2">
        <Button type="button" disabled={blocked || loading} onClick={onSubmit}>
          {loading ? "Calibrating…" : "Calibrate"}
        </Button>
      </DialogFooter>
    </div>
  );
};

// The mikro guard must wrap from the outside: the inner component's queries
// fire on mount, before any JSX-level guard could stop them (CLAUDE.md §1).
export const CalibrateForm = (props: { dataset: string }) => (
  <Guard.Mikro>
    <CalibrateFormInner {...props} />
  </Guard.Mikro>
);

export default CalibrateForm;
