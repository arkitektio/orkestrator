import { Pencil, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ExpTableDatasetFragment } from "@/elektro/api/graphql";
import { useElektroParquetEngine } from "@/elektro/components/store/parquetEngine";
import { readColumnDistinct, readColumnDomain } from "@/lib/parquet/columnStats";
import { ColorMap } from "@/lib/scene/gpu/colormaps";
import {
  entryProblem,
  pickerOptions,
  QUALITATIVE,
  type ColorByLike,
  type FilterByLike,
  type PickerOption,
} from "./pickerModel";
import { usePickerStore } from "./pickerSlice";
import { usePickerWrite } from "./usePickerWrite";

/**
 * A spikes or events layer's colour-by and filter-by, in its card.
 *
 * Two levels, like mikro's picker sections:
 *  - the SWITCHER, always visible: which colour-by is active (or the layer's own
 *    colour), which filters apply — one write each;
 *  - the EDITOR, behind a toggle: add an entry from the options (the root
 *    table's columns, and one hop through each column's `references`), set its
 *    colormap and bounds, remove it. A picker list is written back WHOLE.
 *
 * Options come from table metadata — elektro has no options query. A new filter
 * is seeded from the column itself: its numeric domain, or its distinct values.
 */

const COLORMAPS = Object.values(ColorMap);

const entryCaption = (
  entry: { table: string; column: string; joinPath?: readonly { column: string }[] | null; label?: string | null },
) =>
  entry.label ||
  ((entry.joinPath ?? []).length > 0
    ? `${(entry.joinPath ?? []).map((s) => s.column).join(" › ")} › ${entry.column}`
    : entry.column);

const NUMERIC = /^(u?int|float|double|decimal|bool)/i;

export const PickerSection = ({
  kind,
  layerId,
  root,
  colorBys,
  filterBys,
  activeColorBy,
  activeFilterBys,
  problems = {},
}: {
  kind: "spikes" | "events";
  layerId: string;
  root: ExpTableDatasetFragment | null;
  colorBys: readonly ColorByLike[];
  filterBys: readonly FilterByLike[];
  activeColorBy: number | null;
  activeFilterBys: readonly number[];
  problems?: Record<string, string>;
}) => {
  const write = usePickerWrite(kind, layerId);
  const [editing, setEditing] = useState(false);

  if (!root) {
    return kind === "spikes" ? (
      <div className="text-[11px] text-muted-foreground">No unit table — colour and filters need one.</div>
    ) : null;
  }

  const toggleFilter = (index: number) => {
    const next = activeFilterBys.includes(index)
      ? activeFilterBys.filter((i) => i !== index)
      : [...activeFilterBys, index].sort((a, b) => a - b);
    void write({ activeFilterBys: next });
  };

  return (
    <div className="flex flex-col gap-1 text-[11px]">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Colour by</span>
        <select
          className="ml-auto h-5 max-w-[10rem] truncate rounded border border-border/60 bg-transparent px-1 text-[11px]"
          value={activeColorBy ?? ""}
          onChange={(e) =>
            void write({ activeColorBy: e.currentTarget.value === "" ? null : Number(e.currentTarget.value) })
          }
        >
          <option value="">Layer colour</option>
          {colorBys.map((entry, i) => (
            <option key={i} value={i} disabled={entryProblem(entry, root.id) != null}>
              {entryCaption(entry)}
            </option>
          ))}
        </select>
        <Button
          size="icon-xs"
          variant={editing ? "secondary" : "ghost"}
          title="Edit colour-bys and filters"
          onClick={() => setEditing((v) => !v)}
        >
          <Pencil />
        </Button>
      </div>
      {filterBys.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {filterBys.map((entry, i) => {
            const problem = entryProblem(entry, root.id) ?? problems[`f${i}`];
            const on = activeFilterBys.includes(i);
            return (
              <button
                key={i}
                type="button"
                title={problem ?? (on ? "Filter applied — click to lift it" : "Click to apply this filter")}
                onClick={() => toggleFilter(i)}
                className={
                  "rounded border px-1.5 py-0.5 font-mono text-[10px] " +
                  (problem
                    ? "border-amber-500/60 text-amber-500"
                    : on
                      ? "border-foreground/60 bg-accent"
                      : "border-border/60 text-muted-foreground")
                }
              >
                {entry.exclude ? "not " : ""}
                {entryCaption(entry)}
              </button>
            );
          })}
        </div>
      )}
      {activeColorBy != null && problems[`c${activeColorBy}`] && (
        <div className="text-amber-500">Not drawn: {problems[`c${activeColorBy}`]}</div>
      )}
      {editing && (
        <PickerEditor root={root} colorBys={colorBys} filterBys={filterBys} write={write} />
      )}
    </div>
  );
};

const PickerEditor = ({
  root,
  colorBys,
  filterBys,
  write,
}: {
  root: ExpTableDatasetFragment;
  colorBys: readonly ColorByLike[];
  filterBys: readonly FilterByLike[];
  write: ReturnType<typeof usePickerWrite>;
}) => {
  const service = usePickerStore((s) => s.pickerService);
  const engine = useElektroParquetEngine();
  const [tables, setTables] = useState<Record<string, ExpTableDatasetFragment>>({ [root.id]: root });
  const [adding, setAdding] = useState("");

  // One hop: every table a root column references, through the scope's picker
  // service — the same cache the drivers' joins fill, so nothing is fetched twice.
  const referencedIds = useMemo(
    () => [...new Set(root.columns.map((c) => c.references?.id).filter((id): id is string => !!id))],
    [root],
  );
  useEffect(() => {
    if (!service) return;
    let disposed = false;
    void Promise.all(referencedIds.map((id) => service.table(id).catch(() => null))).then((found) => {
      if (disposed) return;
      setTables((current) => {
        const next = { ...current };
        for (const table of found) if (table) next[table.id] = table as ExpTableDatasetFragment;
        return next;
      });
    });
    return () => {
      disposed = true;
    };
  }, [service, referencedIds]);

  const options = useMemo(() => pickerOptions(root, (id) => tables[id] ?? null), [root, tables]);
  const optionByKey = useMemo(() => new Map(options.map((o) => [o.key, o])), [options]);

  const addColorBy = (option: PickerOption) =>
    void write({
      colorBys: [
        ...colorBys,
        {
          table: option.table,
          column: option.column,
          joinPath: option.joinPath,
          colormap: NUMERIC.test(option.dtype ?? "") ? "VIRIDIS" : "HUES",
        },
      ],
      activeColorBy: colorBys.length,
    });

  const addFilterBy = async (option: PickerOption) => {
    const table = tables[option.table];
    let seed: Partial<FilterByLike> = {};
    if (engine && table) {
      const target = { table: { store: table.store }, column: { name: option.column } };
      try {
        if (NUMERIC.test(option.dtype ?? "")) {
          const domain = await readColumnDomain(engine, target);
          if (domain) seed = { min: domain.min, max: domain.max };
        } else {
          const distinct = await readColumnDistinct(engine, target);
          seed = { values: distinct.values };
        }
      } catch {
        // No seed: the entry starts unconstrained and is edited by hand.
      }
    }
    void write({
      filterBys: [...filterBys, { table: option.table, column: option.column, joinPath: option.joinPath, ...seed }],
    });
  };

  const replaceColorBy = (index: number, patch: Partial<ColorByLike>) =>
    void write({ colorBys: colorBys.map((e, i) => (i === index ? { ...e, ...patch } : e)) });
  const replaceFilterBy = (index: number, patch: Partial<FilterByLike>) =>
    void write({ filterBys: filterBys.map((e, i) => (i === index ? { ...e, ...patch } : e)) });

  return (
    <div className="mt-1 flex flex-col gap-2 rounded border border-border/60 p-2">
      <div className="flex flex-col gap-1">
        <span className="font-semibold">Colour-bys</span>
        {colorBys.map((entry, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="min-w-0 flex-1 truncate font-mono text-[10px]" title={entryProblem(entry, root.id) ?? undefined}>
              {entryCaption(entry)}
            </span>
            <select
              className="h-5 rounded border border-border/60 bg-transparent px-1 text-[10px]"
              value={entry.colormap ?? "VIRIDIS"}
              onChange={(e) => replaceColorBy(i, { colormap: e.currentTarget.value })}
            >
              {COLORMAPS.map((c) => (
                <option key={c} value={c}>
                  {c.toLowerCase()}
                  {QUALITATIVE.has(c) ? " ·" : ""}
                </option>
              ))}
            </select>
            <BoundInput value={entry.min} placeholder="min" onCommit={(min) => replaceColorBy(i, { min })} />
            <BoundInput value={entry.max} placeholder="max" onCommit={(max) => replaceColorBy(i, { max })} />
            <Button
              size="icon-xs"
              variant="ghost"
              title="Remove"
              onClick={() => void write({ colorBys: colorBys.filter((_, j) => j !== i), activeColorBy: null })}
            >
              <X />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-semibold">Filters</span>
        {filterBys.map((entry, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <span className="min-w-0 flex-1 truncate font-mono text-[10px]">{entryCaption(entry)}</span>
              <label className="flex items-center gap-0.5 text-[10px]">
                <input
                  type="checkbox"
                  checked={entry.exclude ?? false}
                  onChange={(e) => replaceFilterBy(i, { exclude: e.currentTarget.checked })}
                />
                exclude
              </label>
              <Button
                size="icon-xs"
                variant="ghost"
                title="Remove"
                onClick={() => void write({ filterBys: filterBys.filter((_, j) => j !== i), activeFilterBys: [] })}
              >
                <X />
              </Button>
            </div>
            {entry.values && entry.values.length > 0 ? (
              <ValuesInput value={entry.values} onCommit={(values) => replaceFilterBy(i, { values })} />
            ) : (
              <div className="flex items-center gap-1">
                <BoundInput value={entry.min} placeholder="min" onCommit={(min) => replaceFilterBy(i, { min })} />
                <span className="text-muted-foreground">…</span>
                <BoundInput value={entry.max} placeholder="max" onCommit={(max) => replaceFilterBy(i, { max })} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <select
          className="h-6 min-w-0 flex-1 truncate rounded border border-border/60 bg-transparent px-1 text-[10px]"
          value={adding}
          onChange={(e) => setAdding(e.currentTarget.value)}
        >
          <option value="">Add a column…</option>
          {options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.caption}
              {o.dtype ? ` (${o.dtype})` : ""}
            </option>
          ))}
        </select>
        <Button
          size="xs"
          variant="outline"
          disabled={!optionByKey.get(adding)}
          onClick={() => {
            const option = optionByKey.get(adding);
            if (option) addColorBy(option);
          }}
        >
          <Plus className="h-3 w-3" /> colour
        </Button>
        <Button
          size="xs"
          variant="outline"
          disabled={!optionByKey.get(adding)}
          onClick={() => {
            const option = optionByKey.get(adding);
            if (option) void addFilterBy(option);
          }}
        >
          <Plus className="h-3 w-3" /> filter
        </Button>
      </div>
    </div>
  );
};

/** A number that commits on blur or Enter; empty is "unset". */
const BoundInput = ({
  value,
  placeholder,
  onCommit,
}: {
  value: number | null | undefined;
  placeholder: string;
  onCommit: (value: number | null) => void;
}) => (
  <input
    key={String(value ?? "")}
    defaultValue={value ?? ""}
    placeholder={placeholder}
    inputMode="decimal"
    className="h-5 w-14 rounded border border-border/60 bg-transparent px-1 font-mono text-[10px]"
    onBlur={(e) => {
      const raw = e.currentTarget.value.trim();
      const next = raw === "" ? null : Number(raw);
      if (next !== null && !Number.isFinite(next)) return;
      if (next !== (value ?? null)) onCommit(next);
    }}
    onKeyDown={(e) => {
      if (e.key === "Enter") e.currentTarget.blur();
    }}
  />
);

/** A comma-separated value set that commits on blur or Enter. */
const ValuesInput = ({ value, onCommit }: { value: readonly string[]; onCommit: (values: string[]) => void }) => (
  <input
    key={value.join(",")}
    defaultValue={value.join(", ")}
    className="h-5 w-full rounded border border-border/60 bg-transparent px-1 font-mono text-[10px]"
    title="Values kept (comma-separated)"
    onBlur={(e) => {
      const next = e.currentTarget.value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      if (next.join(",") !== value.join(",")) onCommit(next);
    }}
    onKeyDown={(e) => {
      if (e.key === "Enter") e.currentTarget.blur();
    }}
  />
);

