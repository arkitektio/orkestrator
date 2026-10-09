/**
 * Lens vocabulary shared by the surfaces that have to tell one lens of a dataset
 * from another — the add-layer picker and the derived-datasets sidebar. Typed
 * structurally rather than against one query's generated shape, because each
 * caller selects its own subset of the Lens fields.
 */

export type LensLabelInput = {
  axisNames: readonly string[];
  shape: readonly number[];
  slices: readonly { axis: string; start?: number | null; stop?: number | null }[];
};

// A one-line descriptor that distinguishes lenses of the same dataset: whether
// the lens is the full array (slices: []) or a slice, plus its axes and shape.
export const lensLabel = (lens: LensLabelInput) => {
  const dims = `${lens.axisNames.join(" × ")} · ${lens.shape.join(" × ")}`;
  if (lens.slices.length === 0) return `full — ${dims}`;
  const slices = lens.slices
    .map((s) => `${s.axis}[${s.start ?? ""}:${s.stop ?? ""}]`)
    .join(", ");
  return `${slices} — ${dims}`;
};

export type LensTitleInput = {
  name?: string | null;
  slices: readonly { axis: string; start?: number | null; stop?: number | null }[];
};

/** What an unsliced lens is called everywhere: the dataset, looked at whole. */
export const WHOLE_ARRAY = "Whole array";

// The slices alone, without the axes and shape `lensLabel` appends — short
// enough to be a heading.
export const sliceSummary = (slices: LensTitleInput["slices"]) =>
  slices.map((s) => `${s.axis}[${s.start ?? ""}:${s.stop ?? ""}]`).join(", ");

/**
 * What to CALL a lens — the headline of its page, its tile and its row.
 *
 * The name someone gave it; failing that, "Whole array" for a lens that cuts
 * nothing; failing that, its slices. `lensLabel` is the technical line that
 * goes underneath: it always spells out the slices, axes and shape, whatever
 * the lens is called.
 */
export const lensTitle = (lens: LensTitleInput) =>
  lens.name?.trim() || (lens.slices.length === 0 ? WHOLE_ARRAY : sliceSummary(lens.slices));
