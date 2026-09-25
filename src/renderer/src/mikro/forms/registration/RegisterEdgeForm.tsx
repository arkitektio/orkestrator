import { useGraphQLDialog } from "@/app/hooks/useGraphQLDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import {
  CoordinateSystemFragment,
  CreatableTransformKind,
  PlacementValidity,
  useCreateTransformationMutation,
} from "../../api/graphql";
import { residentLabel } from "../../components/coordinates/residents";
import {
  AxisLike,
  MappedRow,
  MappingRow,
  RegistrationDraft,
  RegistrationMode,
  buildRegistrationInput,
  hasBlockingIssue,
  isModeAvailable,
  mappedRows,
  prefillMapping,
  validateRegistration,
} from "./mapping";

/**
 * The registration edge form: map the source system's axes onto the target's,
 * give the map its parameters, author the edge.
 *
 * All the arithmetic and every ordering rule lives in ./mapping.ts, which is
 * pure and unit-tested against the real evaluator. This file is the table.
 *
 * On not using react-hook-form: the field kit in components/fields renders a
 * label + description + message block per field, which is the wrong chrome for
 * a grid cell, and RHF buys nothing here — the rows carry object references to
 * axes rather than scalars, and validation is one pure function over the whole
 * draft rather than per-field rules. Plain state keeps the single-list
 * invariant (see mapping.ts) visible instead of hiding it behind field paths.
 */

const UNMAPPED = "__unmapped__";

// A new edge changes both systems' neighbourhoods and can move anything drawn
// in a scene whose world is reachable through it: GetScene re-resolves every
// layer's pathToWorld server-side.
const REFETCH = {
  refetchQueries: ["GetCoordinateSystem", "GetCoordinateGraph", "GetScene"],
  awaitRefetchQueries: true,
};

const MODES: { mode: RegistrationMode; label: string; stored: string }[] = [
  { mode: "IDENTITY", label: "Identity", stored: "IDENTITY" },
  { mode: "SCALE", label: "Scale", stored: "SCALE" },
  { mode: "TRANSLATION", label: "Translate", stored: "TRANSLATION" },
  { mode: "SCALE_TRANSLATE", label: "Scale & translate", stored: "AFFINE" },
  { mode: "AFFINE", label: "Affine (matrix)", stored: "AFFINE" },
];

const modeButton = (active: boolean, disabled: boolean) =>
  `rounded border px-3 py-1 text-sm transition-colors ${
    disabled
      ? "cursor-not-allowed border-input opacity-40"
      : active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-input hover:bg-accent"
  }`;

const axisSignature = (system: CoordinateSystemFragment) =>
  [...system.axes]
    .sort((a, b) => a.order - b.order)
    .map((axis) => axis.name)
    .join(" ");

/** The unit of the axis a parameter lands in — a scale converts INTO these. */
const unitOf = (axis: AxisLike | null): string =>
  (axis?.unit as string | undefined) || "—";

/**
 * The M x (N+1) grid the matrix editor opens onto: identity on the mapped axes,
 * carrying over whatever scale/translation the user already typed.
 *
 * Deliberately NOT a zero grid. A zero matrix collapses every coordinate to the
 * origin, and opening the editor onto one puts the user a single careless
 * submit away from authoring that — an edge which is perfectly valid, silently
 * wrong, and singular (so nothing can even invert it back).
 */
const seedMatrix = (mapped: readonly MappedRow[]): string[][] =>
  mapped.map((row, i) => [
    ...mapped.map((_, j) => (i === j ? String(row.scale ?? 1) : "0")),
    String(row.translation ?? 0),
  ]);

export const RegisterEdgeForm = (props: {
  source: CoordinateSystemFragment;
  target: CoordinateSystemFragment;
  /** Rendered next to the source name, e.g. the owning dataset. */
  sourceContext?: string | null;
  onBack?: () => void;
  onChangeSource?: () => void;
}) => {
  const { source, target } = props;

  // Prefill once per system pair: re-running would discard the user's edits on
  // every render.
  const [rows, setRows] = useState<MappingRow[]>(() =>
    prefillMapping(source.axes, target.axes),
  );
  const [mode, setMode] = useState<RegistrationMode>(() =>
    // Identity is right for the zero-click case (same names, same rank) and is
    // simply the least-committal starting point otherwise.
    isModeAvailable("IDENTITY", prefillMapping(source.axes, target.axes))
      ? "IDENTITY"
      : "SCALE_TRANSLATE",
  );
  const [name, setName] = useState("");
  // Null until the matrix editor is opened, so switching to AFFINE re-seeds
  // from whatever the user has typed by then rather than from a stale grid.
  const [matrix, setMatrix] = useState<string[][] | null>(null);

  const [create, { loading }] = useCreateTransformationMutation();
  const submit = useGraphQLDialog(create, {
    successMessage: "Registered",
    errorPrefix: "Could not register",
  });

  const setRow = (index: number, patch: Partial<MappingRow>) =>
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );

  const draft: RegistrationDraft = useMemo(
    () => ({
      sourceSystemId: source.id,
      targetSystemId: target.id,
      rows,
      mode,
      name,
      matrix: matrix ?? undefined,
    }),
    [source.id, target.id, rows, mode, name, matrix],
  );

  const issues = useMemo(() => validateRegistration(draft), [draft]);
  const blocked = hasBlockingIssue(issues);
  const mapped = mappedRows(rows);

  const claimed = new Set(mapped.map((row) => row.target.name));
  const untouched = target.axes.filter((axis) => !claimed.has(axis.name));

  const showScale = mode === "SCALE" || mode === "SCALE_TRANSLATE";
  const showTranslation = mode === "TRANSLATION" || mode === "SCALE_TRANSLATE";

  // Switching mode re-seeds the grid from the current rows: the matrix editor
  // should open onto what the user has already said, not onto a stale grid or
  // an all-zero one.
  const selectMode = (next: RegistrationMode) => {
    setMode(next);
    setMatrix(next === "AFFINE" ? seedMatrix(mappedRows(rows)) : null);
  };

  // The mapping decides the grid's shape, so a mapping change while the editor
  // is open must reshape it — otherwise the M x (N+1) check fails against a
  // grid the user cannot see is the wrong size.
  const remapRow = (index: number, patch: Partial<MappingRow>) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    setRows(next);
    if (mode === "AFFINE") setMatrix(seedMatrix(mappedRows(next)));
  };

  const onSubmit = () => {
    // `buildRegistrationInput` throws on a non-numeric cell rather than
    // emitting null into a [Float!]; validation blocks that first, so this is
    // belt and braces.
    const input = buildInputForMutation(draft);
    return submit({ variables: { input }, ...REFETCH });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded border border-input p-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-20 shrink-0 text-muted-foreground">
            Registering
          </span>
          <span className="font-medium">{source.name}</span>
          {props.sourceContext && (
            <span className="text-muted-foreground">
              · {props.sourceContext}
            </span>
          )}
          <Badge variant="outline">{residentLabel(source)}</Badge>
          <span className="font-mono text-xs text-muted-foreground">
            {axisSignature(source)}
          </span>
          {props.onChangeSource && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto h-6"
              onClick={props.onChangeSource}
            >
              change
            </Button>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="w-20 shrink-0 text-muted-foreground">into</span>
          <span className="font-medium">{target.name}</span>
          <Badge variant="outline">{residentLabel(target)}</Badge>
          <span className="font-mono text-xs text-muted-foreground">
            {axisSignature(target)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-xs font-medium uppercase text-muted-foreground">
          Transform
        </div>
        <div className="flex flex-wrap gap-2">
          {MODES.map((entry) => {
            const available = isModeAvailable(entry.mode, rows);
            return (
              <button
                key={entry.mode}
                type="button"
                disabled={!available}
                title={
                  available
                    ? `stored as ${entry.stored}`
                    : "This mapping renames an axis, which only an affine can express."
                }
                className={modeButton(mode === entry.mode, !available)}
                onClick={() => selectMode(entry.mode)}
              >
                {entry.label}
              </button>
            );
          })}
        </div>
        <div className="text-xs text-muted-foreground">
          stored as {MODES.find((m) => m.mode === mode)?.stored} ·{" "}
          {mode === "SCALE_TRANSLATE"
            ? "one affine with the scale on the diagonal and the offset in the last column"
            : mode === "IDENTITY"
              ? "the coordinates are taken to be the same numbers"
              : "parameters are ordered by the source system's axes"}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <div className="text-xs font-medium uppercase text-muted-foreground">
            Axis mapping
          </div>
          <div className="text-xs text-muted-foreground">
            {mapped.length} of {rows.length} source axes mapped
          </div>
        </div>

        {/* One row per SOURCE axis, in the source system's `order`, never
            reordered — that order IS `inputAxes` order and the order of every
            parameter array. See mapping.ts. */}
        <div className="overflow-x-auto rounded border border-input">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2 text-left font-medium">source axis</th>
                <th className="p-2 text-left font-medium">maps onto</th>
                {showScale && (
                  <th className="p-2 text-left font-medium">scale</th>
                )}
                {showTranslation && (
                  <th className="p-2 text-left font-medium">translation</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const takenByOther = new Set(
                  rows
                    .filter((other, i) => i !== index && other.target)
                    .map((other) => other.target!.name),
                );
                return (
                  <tr key={row.source.name} className="border-t border-input">
                    <td className="p-2">
                      <span className="font-mono">{row.source.name}</span>{" "}
                      <span className="text-xs text-muted-foreground">
                        {row.source.type} · {unitOf(row.source)}
                      </span>
                    </td>
                    <td className="p-2">
                      <Select
                        value={row.target?.name ?? UNMAPPED}
                        onValueChange={(value) =>
                          remapRow(index, {
                            target:
                              value === UNMAPPED
                                ? null
                                : (target.axes.find((a) => a.name === value) ??
                                  null),
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNMAPPED}>not mapped</SelectItem>
                          {target.axes.map((axis) => (
                            <SelectItem
                              key={axis.name}
                              value={axis.name}
                              disabled={takenByOther.has(axis.name)}
                            >
                              {axis.name} · {axis.type}
                              {axis.unit ? ` · ${axis.unit}` : ""}
                              {takenByOther.has(axis.name)
                                ? " (already mapped)"
                                : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    {showScale && (
                      <td className="p-2">
                        {row.target ? (
                          <div className="flex items-center gap-1">
                            <Input
                              className="h-8"
                              value={String(row.scale ?? "")}
                              onChange={(e) =>
                                setRow(index, { scale: e.target.value })
                              }
                            />
                            <span className="text-xs text-muted-foreground">
                              {unitOf(row.target)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
                    {showTranslation && (
                      <td className="p-2">
                        {row.target ? (
                          <div className="flex items-center gap-1">
                            <Input
                              className="h-8"
                              value={String(row.translation ?? "")}
                              onChange={(e) =>
                                setRow(index, { translation: e.target.value })
                              }
                            />
                            <span className="text-xs text-muted-foreground">
                              {unitOf(row.target)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {untouched.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Untouched target axes:{" "}
            <span className="font-mono">
              {untouched.map((a) => a.name).join(", ")}
            </span>{" "}
            — this edge does not produce them; the world&apos;s other axes are
            left alone.
          </div>
        )}
      </div>

      {mode === "AFFINE" && matrix && mapped.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="text-xs font-medium uppercase text-muted-foreground">
            Affine
          </div>
          {/* Rows are output axes in outputAxes order, columns are input axes
              in inputAxes order, and the last column is the translation — the
              exact M x (N+1) shape evalTransform reads back. Both orders are
              the mapped rows' order, so the labels here ARE the arrays we emit. */}
          <div className="overflow-x-auto rounded border border-input p-2">
            <table className="text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="p-1" />
                  {mapped.map((row) => (
                    <th key={row.source.name} className="p-1 font-mono font-normal">
                      {row.source.name}
                    </th>
                  ))}
                  <th className="p-1 font-normal">translation</th>
                </tr>
              </thead>
              <tbody>
                {mapped.map((row, i) => (
                  <tr key={row.target.name}>
                    <td className="p-1 font-mono text-xs text-muted-foreground">
                      {row.target.name}
                    </td>
                    {matrix[i]?.map((cell, j) => (
                      <td key={j} className="p-1">
                        <Input
                          className="h-8 w-20 font-mono"
                          value={cell}
                          onChange={(e) =>
                            setMatrix((current) =>
                              (current ?? []).map((r, ri) =>
                                ri === i
                                  ? r.map((c, ci) => (ci === j ? e.target.value : c))
                                  : r,
                              ),
                            )
                          }
                        />
                      </td>
                    ))}
                    <td className="p-1 text-xs text-muted-foreground">
                      {unitOf(row.target)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-muted-foreground">
            Rows are the output axes, columns the input axes, last column the
            offset.
          </div>
        </div>
      )}

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
          Name <span className="normal-case font-normal">(optional)</span>
        </div>
        <Input
          value={name}
          placeholder={`${source.name} → ${target.name}`}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="text-xs text-muted-foreground">
          Recorded as {PlacementValidity.Manual} — you authored this map; nothing
          has checked it against the data.
        </div>
      </div>

      <DialogFooter className="mt-2">
        {props.onBack && (
          <Button type="button" variant="outline" onClick={props.onBack}>
            Back
          </Button>
        )}
        <Button type="button" disabled={blocked || loading} onClick={onSubmit}>
          {loading ? "Registering…" : "Register"}
        </Button>
      </DialogFooter>
    </div>
  );
};

/**
 * mapping.ts stays free of generated imports so its suite can run in `node`
 * (see the note at the top of that file), so it types `transform.kind` and
 * `validity` as literals. Widen them onto the real enums here — the literals
 * are exactly the enums' values, and this is the only place the two type
 * worlds meet.
 */
const buildInputForMutation = (draft: RegistrationDraft) => {
  const built = buildRegistrationInput(draft);
  return {
    ...built,
    validity: built.validity as PlacementValidity,
    transform: {
      ...built.transform,
      kind: built.transform.kind as CreatableTransformKind,
    },
  };
};
