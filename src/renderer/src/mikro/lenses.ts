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
