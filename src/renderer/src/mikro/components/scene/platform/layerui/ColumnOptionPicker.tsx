import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Plus } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/core/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";
import {
  useLabelColorByOptionsLazyQuery,
  useLabelFilterByOptionsLazyQuery,
  useMeshColorByOptionsLazyQuery,
  useMeshFilterByOptionsLazyQuery,
  useNetworkColorByOptionsLazyQuery,
  useNetworkFilterByOptionsLazyQuery,
} from "@/mikro/api/graphql";
import {
  isColumnOption,
  isGraphOption,
  isMeasure,
  isSparseOption,
  optionKey,
  optionLabel,
  PER_EDGE_NOTE,
  PER_NODE_NOTE,
  type ColumnOption,
  type GraphOption,
  type SparseOption,
} from "./columnOptions";

/**
 * The "+" that turns a mesh collection's or a label mask's OFFERED columns into
 * a stored colouring or filter rule.
 *
 * FOUR roots, ONE component. `colorByOptions` and `filterByOptions` return the
 * same candidate set under two names, and the label pair
 * (`labelColorByOptions` / `labelFilterByOptions`, rooted on the lens instead of
 * on a collection) returns those same two types again — a mask's pixel values
 * dereference into a table by exactly the FIELD edge a collection's ids do. So
 * the shapes are identical (`ColumnOption`), all four branch on the same
 * `control` split, and which one to ask is a prop.
 *
 * Asking under the right name still matters, and is why `source` and `mode` are
 * separate rather than one flat enum: it is the server's own invariant that
 * everything `filterByOptions` returns is something `createMeshLayer(filterBys:)`
 * accepts, and likewise that `labelFilterByOptions` returns what
 * `createLabelLayer(render: {filterBys:})` accepts.
 *
 * All four lazy hooks are declared unconditionally (hooks rules) and none fires
 * until the popover opens: an options walk crosses the coordinate graph, so it
 * is not something a layer card should pay for on mount.
 *
 * Search is SERVER-side (`filters.search` matches the column's name, its
 * longName and its table's name), hence `shouldFilter={false}` — cmdk's own
 * filter would additionally hide rows the server deliberately returned.
 */

const SEARCH_DEBOUNCE_MS = 200;

export type ColumnOptionPickerMode = "color" | "filter";

/**
 * What the candidates are walked FROM. A mesh layer roots its options on the
 * collection it draws; a label layer on the lens it draws, because a mask IS
 * the thing doing the keying (its pixel values are the ids).
 */
export type ColumnOptionSource =
  | { kind: "mesh"; meshCollection: string }
  | { kind: "label"; lens: string }
  | { kind: "network"; networkCollection: string };

export const ColumnOptionPicker = ({
  source,
  mode,
  taken,
  onPick,
  title,
}: {
  source: ColumnOptionSource;
  mode: ColumnOptionPickerMode;
  /** `optionKey`s already stored on the layer — offered, but marked as added. */
  taken: ReadonlySet<string>;
  onPick: (option: ColumnOption | SparseOption | GraphOption) => void;
  title?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [runMeshColorBy, meshColorByResult] = useMeshColorByOptionsLazyQuery();
  const [runMeshFilterBy, meshFilterByResult] = useMeshFilterByOptionsLazyQuery();
  const [runLabelColorBy, labelColorByResult] = useLabelColorByOptionsLazyQuery();
  const [runLabelFilterBy, labelFilterByResult] = useLabelFilterByOptionsLazyQuery();
  const [runNetworkColorBy, networkColorByResult] = useNetworkColorByOptionsLazyQuery();
  const [runNetworkFilterBy, networkFilterByResult] = useNetworkFilterByOptionsLazyQuery();

  const result =
    source.kind === "label"
      ? mode === "color"
        ? labelColorByResult
        : labelFilterByResult
      : source.kind === "network"
        ? mode === "color"
          ? networkColorByResult
          : networkFilterByResult
        : mode === "color"
          ? meshColorByResult
          : meshFilterByResult;

  // The source's own key is the query variable, so the branches cannot be
  // collapsed into one `run(variables)` call — `meshCollection`, `lens` and
  // `networkCollection` are different arguments to different fields.
  const sourceKey =
    source.kind === "label"
      ? source.lens
      : source.kind === "network"
        ? source.networkCollection
        : source.meshCollection;

  const fetchOptions = useCallback(
    (term: string) => {
      const filters = term.trim() ? { search: term.trim() } : undefined;
      const request =
        source.kind === "label"
          ? (mode === "color" ? runLabelColorBy : runLabelFilterBy)({
              variables: { lens: sourceKey, filters },
            })
          : source.kind === "network"
            ? (mode === "color" ? runNetworkColorBy : runNetworkFilterBy)({
                variables: { networkCollection: sourceKey, filters },
              })
            : (mode === "color" ? runMeshColorBy : runMeshFilterBy)({
                variables: { meshCollection: sourceKey, filters },
              });
      void request.catch((error) => {
        console.warn(`[${source.kind}] could not load column options:`, error);
      });
    },
    [
      source.kind,
      mode,
      sourceKey,
      runLabelColorBy,
      runLabelFilterBy,
      runMeshColorBy,
      runMeshFilterBy,
      runNetworkColorBy,
      runNetworkFilterBy,
    ],
  );

  // Fetch on open, then on every settled search term. Debounced because the
  // walk is server-side work, not a filter over something already in hand.
  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => fetchOptions(search), search ? SEARCH_DEBOUNCE_MS : 0);
    return () => window.clearTimeout(handle);
  }, [open, search, fetchOptions]);

  // Memoized because the `?? []` would otherwise mint a new array every render
  // and re-run the grouping below for nothing.
  //
  // The same roots also offer SPARSE candidates — a slice of a matrix rather
  // than a column of a table.
  const options = useMemo<ColumnOption[]>(
    () => (result.data?.options ?? []).filter(isColumnOption),
    [result.data],
  );

  /**
   * The sparse half, offered in BOTH modes.
   *
   * It used to be colour-only, on the grounds that `LabelFilterByInput.table`
   * and `column` were non-null and a sparse rule therefore had no arm of the
   * mutation to go through. That is no longer true: both filter inputs now take
   * `kind: SPARSE` with a `dataset` and an `at`, so "keep the cells where this
   * ion is above x" is expressible, and dropping these here was the only reason
   * a mask whose one candidate is a matrix showed an EMPTY filter picker.
   *
   * A row here is one MATRIX, never one gene: the position along the identified
   * axis is chosen afterwards, from the table that axis references. That is why
   * a 19,059-feature matrix costs one row.
   */
  const sparseOptions = useMemo<SparseOption[]>(
    () => (result.data?.options ?? []).filter(isSparseOption),
    [result.data],
  );

  /**
   * The GRAPH half, network sources only: the per-node values the collection
   * itself carries, offered first because the server declares them first —
   * they are the entries that cost no store read and no join to render.
   */
  const graphOptions = useMemo<GraphOption[]>(
    () => (result.data?.options ?? []).filter(isGraphOption),
    [result.data],
  );

  /** Grouped by the table the value is READ FROM — the option's own `table`. */
  const groups = useMemo(() => {
    const byTable = new Map<string, { name: string; options: ColumnOption[] }>();
    for (const option of options) {
      const group = byTable.get(option.table.id) ?? { name: option.table.name, options: [] };
      group.options.push(option);
      byTable.set(option.table.id, group);
    }
    return [...byTable.values()];
  }, [options]);

  const empty =
    !result.loading &&
    options.length === 0 &&
    sparseOptions.length === 0 &&
    graphOptions.length === 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={title ?? (mode === "color" ? "Add a colouring" : "Add a filter rule")}
          className="flex h-5 shrink-0 items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 text-[9px] font-medium uppercase tracking-[0.06em] text-white/50 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white/90"
        >
          <Plus className="h-2.5 w-2.5" />
          add
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={mode === "color" ? "Search a column to colour by…" : "Search a column to filter by…"}
            className="h-8 text-xs"
          />
          <CommandList>
            {result.loading && (
              <div className="px-3 py-2 text-[10px] text-muted-foreground">Loading columns…</div>
            )}
            {empty && (
              <CommandEmpty className="px-3 py-2 text-[10px]">
                {search
                  ? "No column matches."
                  : source.kind === "label"
                    ? `This mask's ids reach nothing worth ${mode === "color" ? "colouring" : "filtering"} by.`
                    : `This collection's ids reach nothing worth ${mode === "color" ? "colouring" : "filtering"} by.`}
              </CommandEmpty>
            )}
            {graphOptions.length > 0 && (
              <CommandGroup heading="graph attributes">
                {graphOptions.map((option) => {
                  const key = optionKey(option);
                  const added = taken.has(key);
                  return (
                    <CommandItem
                      key={key}
                      value={key}
                      onSelect={() => {
                        if (added) return;
                        onPick(option);
                        setOpen(false);
                      }}
                      className="gap-2 text-xs"
                      disabled={added}
                      // The one option kind whose value varies WITHIN an
                      // object: per node, off the collection's own geometry,
                      // with no parquet read behind it.
                    >
                      <span className="flex-1 truncate">{option.graphAttribute}</span>
                      <span className="shrink-0 rounded bg-white/5 px-1 text-[9px] text-muted-foreground">
                        per node
                      </span>
                      {added && <Check className="h-3 w-3 shrink-0" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            {sparseOptions.length > 0 && (
              <CommandGroup heading="matrices">
                {sparseOptions.map((option) => {
                  const key = optionKey(option);
                  const added = taken.has(key);
                  return (
                    <CommandItem
                      key={key}
                      value={key}
                      onSelect={() => {
                        if (added) return;
                        onPick(option);
                        setOpen(false);
                      }}
                      className="gap-2 text-xs"
                      disabled={added}
                    >
                      <span className="flex-1 truncate">{option.sparseDataset.name}</span>
                      {/* Which axes a position still has to be given along —
                          the row is the matrix, not the slice. */}
                      <span className="shrink-0 text-[9px] text-muted-foreground">
                        per {option.axes.join(", ")}
                      </span>
                      {added && <Check className="h-3 w-3 shrink-0" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            {groups.map((group) => (
              <CommandGroup key={group.name} heading={group.name}>
                {group.options.map((option) => {
                  const key = optionKey(option);
                  const added = taken.has(key);
                  return (
                    <CommandItem
                      key={key}
                      value={key}
                      onSelect={() => {
                        if (added) return;
                        onPick(option);
                        setOpen(false);
                      }}
                      className="gap-2 text-xs"
                      disabled={added}
                    >
                      <span className="flex-1 truncate">
                        {optionLabel(option)}
                        {option.column.unit ? (
                          <span className="ml-1 text-[9px] text-muted-foreground">
                            {String(option.column.unit)}
                          </span>
                        ) : null}
                      </span>
                      {/* A joined candidate is reached through a `references`
                          hop; say so, because the same column name can be
                          reachable both directly and through a hop. */}
                      {option.joinPath.length > 0 && (
                        <span
                          className="flex shrink-0 items-center text-[9px] text-muted-foreground"
                          title={`via ${option.joinPath
                            .map((step) => `${step.table.name}.${step.column.name}`)
                            .join(" → ")}`}
                        >
                          <ChevronRight className="h-2.5 w-2.5" />
                          joined
                        </span>
                      )}
                      {/* The server's stamped granularity: this column's table
                          is keyed by the collection's NODE ids, so its values
                          vary within an object — the badge is what separates
                          it from the object-level columns beside it. */}
                      {option.target && (
                        <span
                          className="shrink-0 rounded bg-white/5 px-1 text-[9px] text-muted-foreground"
                          title={(option.target === "EDGE" ? PER_EDGE_NOTE : PER_NODE_NOTE).slice(3)}
                        >
                          {option.target === "EDGE" ? "per edge" : "per node"}
                        </span>
                      )}
                      <span className="shrink-0 rounded bg-white/5 px-1 text-[9px] text-muted-foreground">
                        {isMeasure(option) ? "measure" : "categorical"}
                      </span>
                      {added && <Check className="h-3 w-3 shrink-0" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
