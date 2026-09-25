/**
 * The DATA/APPEARANCE key split for a layer's stored picker entries — the one
 * decision that keeps a colormap or clim nudge from rebuilding buffers.
 *
 * Every layer that renders `colorBys`/`filterBys` re-derives two very
 * different things from them: the DATA half (which columns are read, which
 * values land in a buffer or a code table, which objects a rule hides) and
 * the APPEARANCE half (which palette row is bound, where the clim window
 * sits). The costs differ by orders of magnitude, so the re-run keys must
 * too: `useLabelColorLut.ts` first made this split for masks, the network
 * layer took it for its styling, and the mesh layer's LUT rides it as well —
 * one implementation here so the boundary cannot drift per layer kind.
 *
 * WHAT GOES WHERE, and the one subtlety: rules ride in the data key IN FULL
 * (their bounds decide visibility, which is data), the colouring rides
 * WITHOUT colormap/min/max — except for the colormap's qualitative-vs-measure
 * CLASS, because the rank branch writes RANKS where the measure branch writes
 * the numbers themselves. Switching viridis → inferno is appearance;
 * switching viridis → hues is data.
 */
import { qualitativePalette } from "../layerui/colormap-utils";

/** The structural shape of a stored colouring, superset across layer kinds —
 *  a kind that lacks a field simply keys `null` there. */
export type PickerEntryLike = {
  kind?: string | null;
  attribute?: string | null;
  target?: string | null;
  table?: string | null;
  column?: string | null;
  dataset?: string | null;
  at?: readonly { axis: string; value: number }[] | null;
  colormap?: string | null;
  min?: number | null;
  max?: number | null;
  joinPath?: readonly { table: string; column: string }[] | null;
};

export type PickerRuleLike = PickerEntryLike & {
  values?: readonly string[] | null;
  exclude?: boolean | null;
};

/**
 * The COLUMN arm of the stored-colouring either/or: it names a table and a
 * column. A SPARSE entry names a `dataset` and a position `at` instead.
 *
 * Structural, so it also answers for the generic picker shape. The nominal
 * `columnOptions.isColumnColorBy` delegates here and adds the narrowing its
 * callers want — one rule, two typings.
 */
export const isColumnEntry = (entry: PickerEntryLike | null | undefined): boolean =>
  entry?.table != null && entry?.column != null;

/** True when the entry's colormap takes the RANK branch. */
export const entryQualitative = (entry: PickerEntryLike | null): boolean =>
  qualitativePalette((entry?.colormap ?? "") as never) !== null;

/**
 * The DATA key: everything that changes what is read or what lands in a
 * buffer/table — and nothing that only changes how values LOOK.
 */
export const entryDataKeyOf = (
  colorBy: PickerEntryLike | null,
  rules: readonly PickerRuleLike[],
): string =>
  JSON.stringify([
    colorBy && {
      kind: colorBy.kind ?? null,
      attribute: colorBy.attribute ?? null,
      target: colorBy.target ?? null,
      table: colorBy.table ?? null,
      column: colorBy.column ?? null,
      dataset: colorBy.dataset ?? null,
      at: colorBy.at ?? null,
      joinPath: colorBy.joinPath ?? null,
      qualitative: entryQualitative(colorBy),
    },
    rules.map((rule) => ({
      kind: rule.kind ?? null,
      attribute: rule.attribute ?? null,
      target: rule.target ?? null,
      table: rule.table ?? null,
      column: rule.column ?? null,
      dataset: rule.dataset ?? null,
      at: rule.at ?? null,
      joinPath: rule.joinPath ?? null,
      min: rule.min ?? null,
      max: rule.max ?? null,
      values: rule.values ?? null,
      exclude: rule.exclude === true,
    })),
  ]);

/** The APPEARANCE key: the fields a recompose alone can honour. */
export const entryAppearanceKeyOf = (colorBy: PickerEntryLike | null): string =>
  JSON.stringify(colorBy && [colorBy.colormap ?? null, colorBy.min ?? null, colorBy.max ?? null]);
