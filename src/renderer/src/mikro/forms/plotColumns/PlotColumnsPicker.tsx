import { ChartScatter, ChartColumnBig } from "lucide-react";
import { useState } from "react";
import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/ui/select";
import { ColumnCombobox } from "@/mikro/components/columns/ColumnCombobox";

/**
 * Which columns of a table a chart of values draws, and how: POINTS at two (or
 * three) columns, or the DISTRIBUTION of one, per group. The server checks the
 * same (numeric, placed, units agree); this offers only what it would accept.
 */

export type PlotColumn = { name: string; unit: string | null };

export type PlotSpec =
  | { kind: "POINTS"; x: string; y: string; z: string | null; mark: "MARKERS" | "LINE" }
  | { kind: "DISTRIBUTION"; value: string; group: string | null; bins: number | null; mark: "HISTOGRAM" | "BOX" };

/** One column field of the dialog: the shared column combobox, in its form size. */
const ColumnSelect = ({
  value,
  columns,
  onChange,
  optional,
  placeholder,
}: {
  value: string | null;
  columns: readonly PlotColumn[];
  onChange: (value: string | null) => void;
  optional?: boolean;
  placeholder: string;
}) => (
  <ColumnCombobox
    value={value}
    columns={columns}
    onChange={onChange}
    none={optional ? placeholder : undefined}
    placeholder={placeholder}
    size="form"
  />
);

const Field = ({ name, children }: { name: string; children: React.ReactNode }) => (
  <label className="flex flex-col gap-1">
    <span className="text-[11px] text-muted-foreground">{name}</span>
    {children}
  </label>
);

export const PlotColumnsPicker = ({
  numeric,
  groups,
  only,
  busy,
  submitLabel,
  onSubmit,
}: {
  numeric: readonly PlotColumn[];
  groups: readonly PlotColumn[];
  /** A chart already holding layers of one kind takes only that kind. */
  only?: "POINTS" | "DISTRIBUTION" | null;
  busy?: boolean;
  submitLabel: string;
  onSubmit: (spec: PlotSpec) => void;
}) => {
  const [kind, setKind] = useState<"POINTS" | "DISTRIBUTION">(only ?? (numeric.length >= 2 ? "POINTS" : "DISTRIBUTION"));
  const [x, setX] = useState<string | null>(numeric[0]?.name ?? null);
  const [y, setY] = useState<string | null>(numeric[1]?.name ?? null);
  const [z, setZ] = useState<string | null>(null);
  const [pointMark, setPointMark] = useState<"MARKERS" | "LINE">("MARKERS");
  const [value, setValue] = useState<string | null>(numeric[0]?.name ?? null);
  // Every row until a grouping is chosen: the first label column may be a per-object id.
  const [group, setGroup] = useState<string | null>(null);
  const [mark, setMark] = useState<"HISTOGRAM" | "BOX">("HISTOGRAM");
  const [bins, setBins] = useState("");

  if (numeric.length === 0) {
    return <div className="text-xs text-muted-foreground">This table has no numeric column to draw.</div>;
  }

  const ready = kind === "POINTS" ? !!x && !!y && x !== y : !!value;
  const submit = () => {
    if (kind === "POINTS" && x && y) onSubmit({ kind, x, y, z, mark: pointMark });
    if (kind === "DISTRIBUTION" && value) {
      const parsed = Number.parseInt(bins, 10);
      onSubmit({ kind, value, group, bins: Number.isFinite(parsed) && parsed > 0 ? parsed : null, mark });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {!only && (
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["POINTS", ChartScatter, "Points", "one column against another"],
              ["DISTRIBUTION", ChartColumnBig, "Distribution", "one column, per group"],
            ] as const
          ).map(([value, Icon, title, hint]) => (
            <button
              key={value}
              type="button"
              disabled={value === "POINTS" && numeric.length < 2}
              onClick={() => setKind(value)}
              className={`flex items-start gap-2 rounded-md border p-2 text-left transition-colors disabled:opacity-40 ${
                kind === value ? "border-primary bg-primary/10" : "border-border hover:border-foreground/30"
              }`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex flex-col">
                <span className="text-sm font-medium">{title}</span>
                <span className="text-[11px] text-muted-foreground">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {kind === "POINTS" ? (
        <div className="grid grid-cols-2 gap-2">
          <Field name="Across (x)">
            <ColumnSelect value={x} columns={numeric} onChange={setX} placeholder="Column" />
          </Field>
          <Field name="Up (y)">
            <ColumnSelect value={y} columns={numeric.filter((c) => c.name !== x)} onChange={setY} placeholder="Column" />
          </Field>
          <Field name="Colour by">
            <ColumnSelect value={z} columns={numeric.filter((c) => c.name !== x && c.name !== y)} onChange={setZ} optional placeholder="none" />
          </Field>
          <Field name="Drawn as">
            <Select value={pointMark} onValueChange={(v) => setPointMark(v as "MARKERS" | "LINE")}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MARKERS" className="text-xs">
                  Markers
                </SelectItem>
                <SelectItem value="LINE" className="text-xs">
                  A line through them, along x
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Field name="Of">
            <ColumnSelect value={value} columns={numeric} onChange={setValue} placeholder="Column" />
          </Field>
          <Field name="Per">
            <ColumnSelect value={group} columns={groups} onChange={setGroup} optional placeholder="every row" />
          </Field>
          <Field name="Drawn as">
            <Select value={mark} onValueChange={(v) => setMark(v as "HISTOGRAM" | "BOX")}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HISTOGRAM" className="text-xs">
                  Histogram
                </SelectItem>
                <SelectItem value="BOX" className="text-xs">
                  Box per group
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {mark === "HISTOGRAM" && (
            <Field name="Bins">
              <Input className="h-7 text-xs" inputMode="numeric" placeholder="auto" value={bins} onChange={(e) => setBins(e.target.value)} />
            </Field>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" disabled={!ready || busy} onClick={submit}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
};
