import { useCallback, useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  ColorMap,
  ColumnControl,
  useGetTableDatasetLazyQuery,
} from "@/mikro/api/graphql";
import { useDatalayerEndpoint, useMikro } from "@/app/Arkitekt";
import { useAttributeServiceOrNull } from "@/mikro/lib/attributes/AttributeServiceProvider";
import { loadSparseSource } from "@/mikro/lib/sparse/sparseSource";
import { sliceDomain, sliceHistogram } from "@/mikro/lib/sparse/sliceStats";
import {
  DISTINCT_LIMIT,
  describeColumnStatsError,
  readColumnDistinct,
  readColumnDomain,
  type ColumnStatsFailure,
  readColumnHistogram,
  type ColumnDomain,
} from "@/mikro/lib/attributes/columnStats";
import {
  CONTINUOUS_COLORMAPS,
  colormapGradientCSS,
  colormapOfPalette,
  instancePaletteCSS,
  qualitativePalette,
  sampleColormapCSS,
} from "./colormap-utils";
import { ColormapSelect, type ColormapChoice } from "@/lib/scene/layerui/ColormapSelect";
import { SparsePositionPicker } from "./SparsePositionPicker";
import {
  DEFAULT_INSTANCE_COLORMAP,
  INSTANCE_COLORMAPS,
  type FabriksInstanceColormap,
} from "../gpu/instanceColormaps";
import { controlForRole, type ColorByEntry, type FilterByEntry } from "./columnOptions";

/**
 * The configure step behind a stored colouring or rule: which colormap paints a
 * measure, which bound or which values a rule keeps.
 *
 * INLINE, not a popover: an `EntryRow` unfolds this under itself when clicked,
 * so the settings live where the entry lives. Mounting IS opening — the row
 * only renders this while unfolded — which keeps the lazy reads below on-open
 * without an `open` flag.
 *
 * WHICH colormaps a colouring offers follows from the COLUMN, not from which
 * control hosts it: a MEASURE takes the continuous `ColorMap` ramps (plus
 * CLIMS — the bounds the ramp runs between, set against the column's
 * histogram); a CATEGORICAL takes the same instance palettes the default
 * instance-id mode offers, persisted as an explicit `classColors` map over the
 * column's distinct values. Both sit in one compact `ColormapSelect` rather
 * than a spread-out list.
 *
 * Serves BOTH layer kinds. Nothing here reads a mesh-only or label-only field:
 * an entry is a table id plus a column name whichever type it came from, and
 * `ColorByEntry` / `FilterByEntry` are the unions over both.
 *
 * A stored entry carries only its table ID and its column NAME — enough to
 * execute, not enough to draw a control — so this resolves the table lazily on
 * mount to learn the column's role, and reads the column's real contents (its
 * numeric range and histogram, its distinct values) straight out of the
 * parquet. The server publishes neither: `withValues` was removed from the
 * options query precisely so the cheap question (which columns exist) stops
 * paying for the expensive one (what is in them), which only the entry being
 * edited ever needs.
 *
 * All reads are on-mount and uncached beyond Apollo's own cache — this is a
 * user unfolding a row, not a hot path.
 */

/**
 * A step fine enough to reach any value in the range without a slider that
 * needs a thousand pixels. An integral column steps by 1 — a count of nuclei
 * has no 3.4 — and anything else divides its own span.
 */
const sliderStep = (domain: { min: number; max: number }): number => {
  const span = domain.max - domain.min;
  if (!(span > 0)) return 1;
  const integral = Number.isInteger(domain.min) && Number.isInteger(domain.max) && span >= 4;
  return integral ? 1 : span / 200;
};

/**
 * A bound as a reader wants to see it. An ion intensity is a float with fifteen
 * digits behind it and none of them are the point; an integral count keeps
 * every digit it has.
 */
const readable = (value: number): string =>
  Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(4)));

/**
 * A typed bound. An empty field is not a cleared bound — the write path refuses
 * a rule with no bound at all — so it falls back to the edge passed as
 * `fallback`, which is the widest thing the bound can legally say.
 *
 * `domain` CLAMPS it, and is null where clamping would be a lie. A column's
 * domain is the complete truth about that column, so a bound outside it selects
 * nothing and the control is right to refuse it. A SPARSE slice's domain is the
 * truth about ONE slice, and a window deliberately held wider than the slice on
 * screen — so two of them can be compared against the same ramp — is exactly
 * what that clamp would eat.
 */
const clampToDomain = (
  raw: string,
  domain: { min: number; max: number } | null,
  fallback: number,
): number => {
  const value = raw.trim() === "" ? fallback : Number(raw);
  if (!Number.isFinite(value)) return fallback;
  if (!domain) return value;
  return Math.min(Math.max(value, domain.min), domain.max);
};

type Draft = {
  /** (SPARSE) which slice of the matrix to read. */
  at?: { axis: string; value: number }[];
  colormap?: ColorMap | null;
  classColors?: unknown;
  min?: number | null;
  max?: number | null;
  values?: string[] | null;
  exclude?: boolean;
};

/** Histogram plot height — shorter than the Levels editor's 64: this sits
 * inline in an unfolded row, not in a dedicated transfer editor. */
const HIST_PLOT_HEIGHT = 40;

/**
 * The column's distribution behind a bounds slider, drawn the way the
 * intensity layer's Levels histogram is: an SVG plot whose bars are painted by
 * sampling the COLORMAP along the axis (so the histogram previews the ramp the
 * values will take), with the out-of-selection regions dimmed by two overlay
 * rects and the selection edges marked by dashed lines. A filter rule has no
 * colormap, so its bars stay neutral — same plot, no ramp to preview.
 *
 * Log-scaled counts, same as Levels: attribute columns are routinely dominated
 * by one bin and a linear scale renders as one spike.
 *
 * Pure display — the thumbs below are the control — but it is what turns
 * "pick two numbers" into "put the ramp where the data is".
 */
const HistogramBars = ({
  bins,
  domain,
  selectionMin,
  selectionMax,
  colormap,
}: {
  bins: number[];
  domain: { min: number; max: number };
  selectionMin: number;
  selectionMax: number;
  /** The ramp the bars preview; absent for a filter rule. */
  colormap?: ColorMap | null;
}) => {
  const span = Math.max(domain.max - domain.min, Number.EPSILON);
  const xOf = (v: number) =>
    Math.min(Math.max(((v - domain.min) / span) * 100, 0), 100);

  // Bars deliberately do NOT depend on the selection — the drag moves the two
  // overlay rects below instead of recoloring every bar per tick (the same
  // lesson the Levels editor's bars memo records).
  const bars = useMemo(() => {
    let peak = 1;
    for (const count of bins) if (count > peak) peak = count;
    const maxLog = Math.log1p(peak);
    const width = 100 / bins.length;
    return bins.map((count, index) => {
      if (!(count > 0)) return null;
      const height = Math.max(
        (Math.log1p(count) / maxLog) * HIST_PLOT_HEIGHT,
        // A non-empty bin always shows at least a sliver: a bar that rounds
        // to nothing reads as "no values here", which is a lie.
        2,
      );
      return (
        <rect
          key={index}
          x={index * width}
          y={HIST_PLOT_HEIGHT - height}
          width={width + 0.15}
          height={height}
          fill={
            colormap
              ? sampleColormapCSS(colormap, bins.length > 1 ? index / (bins.length - 1) : 0)
              : "rgba(255,255,255,0.55)"
          }
        />
      );
    });
  }, [bins, colormap]);

  const lo = xOf(selectionMin);
  const hi = xOf(selectionMax);

  return (
    <div className="overflow-hidden rounded border border-white/10 bg-black/25" aria-hidden>
      <svg
        className="block w-full"
        viewBox={`0 0 100 ${HIST_PLOT_HEIGHT}`}
        preserveAspectRatio="none"
        style={{ height: HIST_PLOT_HEIGHT }}
      >
        <rect x={0} y={0} width={100} height={HIST_PLOT_HEIGHT} fill="rgba(0,0,0,0.3)" />
        {bars}
        {/* Out-of-selection dimming: two overlay rects instead of per-bar
            recoloring, so a slider drag moves an attribute on two elements. */}
        {lo > 0 && (
          <rect x={0} y={0} width={lo} height={HIST_PLOT_HEIGHT} fill="rgba(0,0,0,0.6)" />
        )}
        {hi < 100 && (
          <rect
            x={hi}
            y={0}
            width={100 - hi}
            height={HIST_PLOT_HEIGHT}
            fill="rgba(0,0,0,0.6)"
          />
        )}
        {[lo, hi].map((x, index) => (
          <line
            key={index}
            x1={x}
            y1={0}
            x2={x}
            y2={HIST_PLOT_HEIGHT}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={0.4}
            strokeDasharray="2,2"
          />
        ))}
      </svg>
    </div>
  );
};

/**
 * A bound PAIR over a measure column — the one control clims and filter rules
 * share, because both are "two numbers on the column's own range" and only
 * their meaning differs. Never one loose end: the write path refuses a rule
 * naming neither a bound nor values, so "clear the field" is not an available
 * state here — an emptied input snaps back to the column's own edge, which is
 * the widest legal thing the bound can say.
 */
const BoundsControl = ({
  label,
  stored,
  domain,
  histogram,
  colormap,
  subject = "column",
  clampTyped = true,
  onAuto,
  onCommit,
}: {
  label: string;
  /** The entry's stored bounds; null/undefined halves fall back to the domain. */
  stored: { min?: number | null; max?: number | null };
  domain: { min: number; max: number };
  histogram: number[] | null;
  /** Paints the histogram's bars with the ramp being climmed; see above. */
  colormap?: ColorMap | null;
  /** What the footer's range line is about — a column, or one slice of a matrix. */
  subject?: string;
  /**
   * Whether a TYPED bound is held inside `domain`. True for a column, whose
   * domain is the whole truth; false for a slice, where the domain is one
   * slice's and a wider window is the point (see `clampToDomain`). The slider
   * still spans the domain either way — a typed bound outside it grows the
   * domain on the next render, which is how it becomes reachable.
   */
  clampTyped?: boolean;
  /**
   * Offered only where "no bounds at all" is a legal, meaningful state: a
   * SPARSE colouring, whose null clims mean "rescale to whatever slice is
   * showing". "full range" writes the numbers the current data happens to
   * span and so FREEZES the window; this clears them again.
   */
  onAuto?: () => void;
  onCommit: (min: number, max: number) => void;
}) => {
  /**
   * The bounds mid-drag, before the slider settles and the entry is written.
   * Tagged with the stored bounds they were dragged FROM, so the fold that
   * brings the server's answer back retires them without an effect having to
   * notice. Unmounting (folding the row) abandons them.
   */
  const [draft, setDraft] = useState<{ min: number; max: number; from: string } | null>(null);
  const storedKey = `${stored.min ?? ""}|${stored.max ?? ""}`;

  /** What the two thumbs sit at: the draft mid-drag, the stored bounds otherwise. */
  const bounds =
    draft && draft.from === storedKey
      ? { min: draft.min, max: draft.max }
      : { min: stored.min ?? domain.min, max: stored.max ?? domain.max };

  /**
   * Always BOTH bounds, always ordered. An entry carrying only the half the
   * user last touched is how an edit turns into an unbounded (and rejected)
   * rule, and a min above its max keeps nothing while reading like a range.
   */
  const commit = useCallback(
    (low: number, high: number) => onCommit(Math.min(low, high), Math.max(low, high)),
    [onCommit],
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[9px] uppercase tracking-[0.08em] text-white/35">{label}</span>
        <div className="flex items-baseline gap-2">
          {onAuto && (
            <button
              type="button"
              title="Drop the bounds — every slice rescales to its own range again"
              className="text-[9px] text-white/40 underline-offset-2 hover:text-white/80 hover:underline"
              onClick={onAuto}
            >
              auto
            </button>
          )}
          <button
            type="button"
            className="text-[9px] text-white/40 underline-offset-2 hover:text-white/80 hover:underline"
            onClick={() => commit(domain.min, domain.max)}
          >
            full range
          </button>
        </div>
      </div>
      {histogram && (
        <HistogramBars
          bins={histogram}
          domain={domain}
          selectionMin={bounds.min}
          selectionMax={bounds.max}
          colormap={colormap}
        />
      )}
      {/* Two thumbs on the column's OWN range: a bound typed blind against an
          unknown domain is how a selection ends up hiding everything, so the
          control is the domain. */}
      <Slider
        min={domain.min}
        max={domain.max}
        step={sliderStep(domain)}
        value={[bounds.min, bounds.max]}
        onValueChange={([low, high]) => setDraft({ min: low, max: high, from: storedKey })}
        onValueCommit={([low, high]) => commit(low, high)}
        className="py-1"
      />
      <div className="flex items-center gap-1">
        <Input
          key={`min:${stored.min ?? ""}`}
          type="number"
          className="h-6 text-[10px]"
          defaultValue={bounds.min}
          onBlur={(event) =>
            commit(clampToDomain(event.target.value, clampTyped ? domain : null, domain.min), bounds.max)
          }
        />
        <span className="text-[9px] text-white/40">…</span>
        <Input
          key={`max:${stored.max ?? ""}`}
          type="number"
          className="h-6 text-[10px]"
          defaultValue={bounds.max}
          onBlur={(event) =>
            commit(bounds.min, clampToDomain(event.target.value, clampTyped ? domain : null, domain.max))
          }
        />
      </div>
      <div className="text-[9px] text-white/35">
        {subject} runs {readable(domain.min)} … {readable(domain.max)}
      </div>
    </div>
  );
};

/**
 * The clim half of a SPARSE colouring: the slice's own distribution, and the
 * two bounds the ramp runs between.
 *
 * WHY IT CAN EXIST NOW. This block used to be a comment refusing to draw a
 * slider, on the grounds that a slice's range is not known until it is read and
 * that a domain invented for it would be worse than none. The premise was
 * right; the conclusion followed only while nothing here read the slice. It
 * does now — the same one-slice read the layer itself performs, on mount, which
 * for this component IS on unfold (see the module docblock). So the domain is
 * the slice's real one, and the plot below is the reason to trust it.
 *
 * AUTO STAYS THE DEFAULT. Null clims mean "rescale to whatever slice is
 * showing", which is what makes a gene maxing at 3 legible beside one maxing at
 * 400 (`picker.py`'s argument, unchanged). Nothing here writes bounds until the
 * user moves something, and `auto` clears them again.
 *
 * SERVES A RULE TOO. A filter over a slice is the same two numbers against the
 * same distribution — "keep the cells where this ion is above x" — so `mode`
 * only changes what the bounds MEAN (a window the ramp runs between, or the
 * band that is kept), whether a colormap paints the bars, and whether `auto` is
 * offered: a rule stating neither a bound nor a value set is refused by the
 * write path, so null bounds are not a state a rule may be in.
 *
 * BOUNDS SURVIVE A SLICE CHANGE, deliberately: a window held fixed across genes
 * is how two of them are compared quantitatively, which is the whole reason to
 * set one by hand. The domain then grows to contain the stored bounds — the
 * same thing the Levels editor does — so a window wider than the slice stays
 * reachable rather than snapping to the data's edge, and the histogram is
 * re-binned over that grown domain so the bars and the thumbs keep agreeing on
 * the axis. It is also why a bound TYPED here is not clamped to the slice: 400
 * against a slice topping out at 12 is a window, not a mistake, and clamping it
 * back to 12 would make the fixed window unauthorable from the slice a user
 * happens to be looking at.
 */
const SparseSliceSettings = ({
  dataset,
  at,
  mode,
  colormap,
  stored,
  onCommit,
}: {
  dataset: string;
  at: readonly { axis: string; value: number }[];
  mode: "color" | "filter";
  /** The ramp the bars preview. A rule has none — same plot, neutral bars. */
  colormap?: ColorMap | null;
  stored: { min?: number | null; max?: number | null };
  onCommit: (patch: Draft) => void;
}) => {
  const client = useMikro();
  const datalayer = useDatalayerEndpoint();
  /** The slice's values, flat — the map's keys are the renderer's business. */
  const [slice, setSlice] = useState<{ values: number[]; slotCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A slice is identified by WHICH position it is read at, and `at` is a fresh
  // array on every render of the row above.
  const atKey = JSON.stringify(at.map((position) => [position.axis, position.value]));

  useEffect(() => {
    if (!datalayer) return;
    let cancelled = false;
    setSlice(null);
    setError(null);
    void (async () => {
      const source = await loadSparseSource(client, datalayer, dataset);
      const read = await source.read(source.source, at);
      if (cancelled) return;
      setSlice({ values: [...read.values.values()], slotCount: read.slotCount });
    })().catch((cause: unknown) => {
      if (cancelled) return;
      setError(cause instanceof Error ? cause.message : String(cause));
    });
    return () => {
      cancelled = true;
    };
    // `at` is read inside; `atKey` is what decides whether this re-reads, for
    // the reason above. `client` is infrastructure and may not be stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, atKey, datalayer]);

  /** The slice's own range, grown to contain any stored bound (see above). */
  const domain = useMemo(() => {
    if (!slice) return null;
    const base = sliceDomain(slice.values);
    return {
      min: Math.min(base.min, stored.min ?? base.min),
      max: Math.max(base.max, stored.max ?? base.max),
    };
  }, [slice, stored.min, stored.max]);

  const histogram = useMemo(
    () => (slice && domain ? sliceHistogram(slice.values, slice.slotCount, domain) : null),
    [slice, domain],
  );

  if (!datalayer) {
    return (
      <div className="text-[9px] text-white/35">
        {mode === "filter"
          ? "no datalayer is configured, so the slice cannot be read — the rule keeps its stored bounds"
          : "no datalayer is configured, so the slice cannot be read — it still rescales to its own range"}
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-[10px] text-amber-300/80">
        Could not read the slice: {error}
      </div>
    );
  }
  if (!domain) return <div className="text-[10px] text-white/40">Reading the slice…</div>;

  const isFilter = mode === "filter";
  const bounded = stored.min != null || stored.max != null;
  return (
    <>
      <BoundsControl
        label={isFilter ? "keep between" : "clims"}
        stored={stored}
        domain={domain}
        histogram={histogram}
        colormap={colormap}
        subject="this slice"
        clampTyped={false}
        onAuto={!isFilter && bounded ? () => onCommit({ min: null, max: null }) : undefined}
        onCommit={(min, max) => onCommit({ min, max })}
      />
      <div className="text-[9px] text-white/35">
        {isFilter
          ? "an object the slice never mentions has value 0, and is kept or dropped by these bounds like any other"
          : bounded
            ? "every slice is drawn against these; auto rescales each to its own range"
            : "scaled to this slice’s own range — move a thumb to hold a window across slices"}
      </div>
    </>
  );
};

export const ColumnEntrySettings = ({
  entry,
  mode,
  onCommit,
}: {
  entry: ColorByEntry | FilterByEntry;
  mode: "color" | "filter";
  onCommit: (patch: Draft) => void;
}) => {
  const service = useAttributeServiceOrNull();
  const [loadTable, tableResult] = useGetTableDatasetLazyQuery();
  const [domain, setDomain] = useState<ColumnDomain>(null);
  const [histogram, setHistogram] = useState<number[] | null>(null);
  const [distinct, setDistinct] = useState<{ values: string[]; truncated: boolean } | null>(
    null,
  );
  const [statsError, setStatsError] = useState<ColumnStatsFailure | null>(null);

  const table = tableResult.data?.tableDataset;
  const column = table?.columns.find((candidate) => candidate.name === entry.column);
  const control = column ? controlForRole(column.role) : null;

  useEffect(() => {
    // A SPARSE colouring names no table — there is nothing to resolve, and the
    // stats below stay unread rather than being asked of `null`.
    const tableId = entry.table;
    if (tableId == null) return;
    void loadTable({ variables: { id: tableId } }).catch((error) => {
      console.warn("[layer] could not resolve the entry's table:", error);
    });
  }, [entry.table, loadTable]);

  // The values read is gated on the ROLE, which only arrives with the table —
  // a distinct scan over a measure column, or a min/max over a label one, is
  // the wrong question asked expensively. A measure reads its domain and then
  // its histogram off that domain, so the bars and the slider agree on the
  // axis by construction.
  useEffect(() => {
    if (!service || !table || !column || !control) return;
    let cancelled = false;
    const target = { table: { store: table.store }, column: { name: column.name } };
    const read =
      control === ColumnControl.Measure
        ? readColumnDomain(service.engine, target).then(async (result) => {
            if (cancelled) return;
            setDomain(result);
            if (!result) return;
            const bins = await readColumnHistogram(service.engine, target, result);
            if (!cancelled) setHistogram(bins);
          })
        : readColumnDistinct(service.engine, target).then((result) => {
            if (!cancelled) setDistinct(result);
          });
    read.catch((error: unknown) => {
      if (cancelled) return;
      const failure = describeColumnStatsError(error, table.store);
      // The detail is a DuckDB SQL error carrying the statement and the s3://
      // URL — useful when debugging, unreadable in a caption.
      console.warn("[layer] could not read the column's values:", failure.detail);
      setStatsError(failure);
    });
    return () => {
      cancelled = true;
    };
  }, [service, table, column, control]);

  const isFilter = mode === "filter";
  const rule = entry as FilterByEntry;
  const colouring = entry as ColorByEntry;
  // The clim fields land with the backend; read them structurally until the
  // generated fragment carries them.
  const clims = entry as { min?: number | null; max?: number | null };
  const selected = useMemo(() => new Set(rule.values ?? []), [rule.values]);

  const toggleValue = useCallback(
    (value: string) => {
      const next = new Set(selected);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      // Never empty: a rule naming no values is the one the write path rejects
      // ("matches every row, which is not a filter"), and "keep nothing" is
      // what `exclude` expresses instead.
      if (next.size === 0) return;
      onCommit({ values: [...next] });
    },
    [selected, onCommit],
  );

  // ------------------------------------------------- colormap select choices
  /** Continuous ramps for a measure colouring -- every member that is not a palette. */
  const measureChoices: ColormapChoice[] = useMemo(
    () =>
      CONTINUOUS_COLORMAPS.map((cm) => ({
        value: cm,
        label: cm.toLowerCase(),
        css: colormapGradientCSS(cm, 18),
      })),
    [],
  );

  /**
   * The instance palettes for a categorical colouring — the SAME set the default instance-id
   * mode offers, so "categorical" always means these whichever entry hosts it.
   *
   * A pick is now one enum member on the entry's own `colormap`, where a measure column's ramp
   * also lives. It used to be persisted as an explicit `classColors` map over the column's
   * distinct values, which meant the control could not be offered until they had been read,
   * covered only the first `DISTINCT_LIMIT` of them, and needed a reserved `__palette` key
   * smuggled into the map so this select could tell which palette it was looking at. A
   * qualitative colormap is a function of a value's rank, so none of that is needed: no read,
   * no cap, and the "custom" state a hand-made map used to leave behind cannot arise.
   */
  const categoricalValue = qualitativePalette(colouring.colormap) ?? DEFAULT_INSTANCE_COLORMAP;
  const categoricalChoices: ColormapChoice[] = useMemo(
    () =>
      INSTANCE_COLORMAPS.map((name) => ({
        value: name,
        label: name,
        css: instancePaletteCSS(name),
      })),
    [],
  );

  const pickCategorical = (value: string) => {
    onCommit({ colormap: colormapOfPalette(value as FabriksInstanceColormap) });
  };

  // A GRAPH entry names a per-node value the network collection itself
  // carries — no table to resolve, no matrix to slice, and no parquet to scan
  // a domain out of: the values ride the decoded geometry, and an open clim
  // end already means "stretch over what was read" down in the renderer. So
  // the editor is deliberately spare: the ramp, free-form bounds, which of the
  // network's two row sets the entry aims at, and (for a rule) the invert.
  const graphAttribute = (entry as { attribute?: string | null }).attribute;
  if (graphAttribute) {
    const target = ((entry as { target?: string | null }).target ?? "NODE") as string;
    const parseBound = (raw: string): number | null => {
      const value = Number(raw);
      return raw.trim() === "" || !Number.isFinite(value) ? null : value;
    };
    return (
      <div className="space-y-2 text-xs">
        <div className="truncate text-[9px] text-white/35">
          graph attribute “{graphAttribute}” — one value per node, off the collection itself
        </div>
        {!isFilter && (
          <div className="space-y-1.5">
            <div className="text-[9px] uppercase tracking-[0.08em] text-white/35">colormap</div>
            <ColormapSelect
              value={colouring.colormap ?? ColorMap.Viridis}
              choices={measureChoices}
              onChange={(value) => onCommit({ colormap: value as ColorMap })}
              title="The ramp the attribute's values are painted with — always measured, never a palette"
            />
          </div>
        )}
        <div className="space-y-1">
          <div className="text-[9px] uppercase tracking-[0.08em] text-white/35">
            {isFilter ? "keep between" : "clims"}
          </div>
          <div className="flex items-center gap-1.5">
            {(["min", "max"] as const).map((end) => (
              <input
                key={end}
                type="number"
                step="any"
                placeholder={end}
                defaultValue={(isFilter ? rule : clims)[end] ?? ""}
                onBlur={(event) => onCommit({ [end]: parseBound(event.target.value) })}
                className="w-full rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/80"
                title={
                  isFilter
                    ? "Inclusive bound; leave empty for an open end"
                    : "Leave empty to stretch the ramp over the values on screen"
                }
              />
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-[9px] uppercase tracking-[0.08em] text-white/35">applies to</div>
          <div className="flex gap-1">
            {(["NODE", "EDGE"] as const).map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => onCommit({ target: choice } as never)}
                className={`rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em] ${
                  target === choice
                    ? "border-white/30 bg-white/10 text-white/90"
                    : "border-white/10 bg-white/5 text-white/45 hover:text-white/80"
                }`}
                title={
                  choice === "NODE"
                    ? "Nodes and everything touching them — a segment takes its start node's value, so this paints (or hides) the wireframe too"
                    : "Segments only; node glyphs keep the base colour (a rule hides segments without taking their glyphs)"
                }
              >
                {choice.toLowerCase()}s
              </button>
            ))}
          </div>
        </div>
        {isFilter && (
          <label className="flex items-center justify-between gap-2 border-t border-white/5 pt-2 text-[10px]">
            <span className="text-white/40">invert — drop what matches instead</span>
            <Switch
              checked={rule.exclude}
              onCheckedChange={(checked) => onCommit({ exclude: checked })}
            />
          </label>
        )}
      </div>
    );
  }

  // A SPARSE entry names a matrix and a position rather than a table and a
  // column, so it gets its own settings entirely: which slice to read, and the
  // bounds over it. There is no role to resolve and no column stats to scan — a
  // slice is always MEASURED, which is why a sparse rule is a bound and never a
  // value set.
  //
  // BOTH modes, since the filter inputs grew their sparse arm: a rule over a
  // slice is the same position picker and the same bounds control, minus the
  // colormap and plus the invert switch.
  const sparseDataset = (entry as { dataset?: string | null }).dataset;
  if (sparseDataset) {
    return (
      <div className="space-y-2 text-xs">
        <SparsePositionPicker
          dataset={sparseDataset}
          at={entry.at ?? []}
          // Field by field, never a spread: a position read back off the wire
          // carries `__typename`, `AxisPositionInput` has no such field, and
          // this patch OVERWRITES the `at` the entry→input mapper just cleaned.
          onCommit={(at) =>
            onCommit({ at: at.map(({ axis, value }) => ({ axis, value })) })
          }
        />
        {!isFilter && (
          <div className="space-y-1.5">
            <div className="text-[9px] uppercase tracking-[0.08em] text-white/35">colormap</div>
            <ColormapSelect
              value={colouring.colormap ?? ColorMap.Magma}
              choices={measureChoices}
              onChange={(value) => onCommit({ colormap: value as ColorMap })}
            />
          </div>
        )}
        {/* The bounds, over the slice's REAL domain — read here rather than
            invented. See `SparseSliceSettings`. */}
        <SparseSliceSettings
          dataset={sparseDataset}
          at={entry.at ?? []}
          mode={mode}
          colormap={isFilter ? null : (colouring.colormap ?? ColorMap.Magma)}
          stored={clims}
          onCommit={onCommit}
        />
        {isFilter && (
          <label className="flex items-center justify-between gap-2 border-t border-white/5 pt-2 text-[10px]">
            <span className="text-white/40">invert — drop what matches instead</span>
            <Switch
              checked={rule.exclude}
              onCheckedChange={(checked) => onCommit({ exclude: checked })}
            />
          </label>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 text-xs">
      {column?.unit != null && (
        <div className="truncate text-[9px] text-white/35">unit: {String(column.unit)}</div>
      )}

      {tableResult.loading && (
        <div className="text-[10px] text-white/40">Resolving column…</div>
      )}
      {!tableResult.loading && table && !column && (
        <div className="text-[10px] text-amber-300/80">
          {table.name} no longer declares a column named “{entry.column}”.
        </div>
      )}
      {statsError && (
        <div className="text-[10px] text-amber-300/80" title={statsError.detail}>
          Could not read the column’s values: {statsError.summary}. The full error is in
          the console.
        </div>
      )}

      {/* ---------------------------------------------------- colouring --- */}
      {!isFilter && control === ColumnControl.Measure && (
        <div className="space-y-1.5">
          <div className="text-[9px] uppercase tracking-[0.08em] text-white/35">colormap</div>
          <ColormapSelect
            value={colouring.colormap ?? ColorMap.Viridis}
            choices={measureChoices}
            onChange={(value) => onCommit({ colormap: value as ColorMap })}
            title="The ramp the column's values are painted with"
          />
          {domain === null && !statsError && (
            <div className="text-[10px] text-white/40">Reading the column’s range…</div>
          )}
          {domain && (
            <>
              <BoundsControl
                label="clims"
                stored={clims}
                domain={domain}
                histogram={histogram}
                colormap={colouring.colormap ?? ColorMap.Viridis}
                onCommit={(min, max) => onCommit({ min, max })}
              />
              <div className="text-[9px] text-white/35">
                the ramp runs between these; values outside clamp to its ends
              </div>
            </>
          )}
        </div>
      )}
      {!isFilter && control === ColumnControl.Categorical && (
        <div className="space-y-1.5">
          <div className="text-[9px] uppercase tracking-[0.08em] text-white/35">palette</div>
          <ColormapSelect
            value={categoricalValue}
            choices={categoricalChoices}
            onChange={pickCategorical}
            title="Each distinct value takes its own colour from this palette"
          />
          {distinct && (
            <div className="text-[9px] text-white/35">
              {distinct.values.length}
              {distinct.truncated ? "+" : ""} distinct values, a colour each
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------- rule ---- */}
      {isFilter && control === ColumnControl.Measure && (
        <div className="space-y-1.5">
          {domain === null && !statsError && (
            <div className="text-[10px] text-white/40">Reading the column’s range…</div>
          )}
          {domain && (
            <BoundsControl
              label="keep between"
              stored={rule}
              domain={domain}
              histogram={histogram}
              onCommit={(min, max) => onCommit({ min, max })}
            />
          )}
        </div>
      )}
      {isFilter && control === ColumnControl.Categorical && (
        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[9px] uppercase tracking-[0.08em] text-white/35">
              keep these values
            </span>
            {distinct && distinct.values.length > 0 && (
              <button
                type="button"
                className="text-[9px] text-white/40 underline-offset-2 hover:text-white/80 hover:underline"
                onClick={() => onCommit({ values: distinct.values })}
              >
                all
              </button>
            )}
          </div>
          {distinct === null && !statsError && (
            <div className="text-[10px] text-white/40">Reading values…</div>
          )}
          {distinct && (
            <div className="max-h-40 space-y-0.5 overflow-y-auto">
              {distinct.values.map((value) => {
                const on = selected.has(value);
                // The last remaining value cannot be unchecked: a rule naming
                // no values is the one the write path rejects, and "keep
                // nothing" is what `invert` below is for.
                const locked = on && selected.size === 1;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={locked}
                    title={
                      locked
                        ? "A rule has to name at least one value — invert it instead"
                        : on
                          ? `Stop keeping ${value}`
                          : `Also keep ${value}`
                    }
                    onClick={() => toggleValue(value)}
                    className={`flex w-full items-center gap-2 rounded px-1 py-0.5 text-[10px] text-white/70 ${
                      locked ? "opacity-60" : "hover:bg-white/5"
                    }`}
                  >
                    <span className="flex-1 truncate text-left">{value}</span>
                    {on && <Check className="h-3 w-3 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
          {/* A list cut at the cap read as complete is worse than no list: a
              rule authored against it silently drops what it never showed. */}
          {distinct?.truncated && (
            <div className="text-[9px] text-amber-300/80">
              More than {DISTINCT_LIMIT} distinct values — showing the first
              {" "}
              {DISTINCT_LIMIT}. Narrow with a bound instead if this is not the
              whole set you meant.
            </div>
          )}
        </div>
      )}

      {isFilter && (
        <label className="flex items-center justify-between gap-2 border-t border-white/5 pt-2 text-[10px]">
          <span className="text-white/40">invert — drop what matches instead</span>
          <Switch
            checked={rule.exclude}
            onCheckedChange={(checked) => onCommit({ exclude: checked })}
          />
        </label>
      )}
    </div>
  );
};
