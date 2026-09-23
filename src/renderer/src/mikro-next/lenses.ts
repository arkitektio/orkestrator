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

/** One axis row of the create-lens form, as typed: empty means "not cut". */
export type SliceDraft = { start: string; stop: string; step: string };

export type SliceDraftResult =
  | { ok: true; slices: { axis: string; start?: number; stop?: number; step?: number }[] }
  | { ok: false; errors: Record<string, string> };

const parseBound = (raw: string): number | null | "invalid" => {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return "invalid";
  return Number(trimmed);
};

/**
 * Turns the form's per-axis drafts into `SliceInput`s. An axis whose row
 * selects the whole extent (empty, or 0..extent step 1) is dropped rather than
 * sent, so leaving every row alone yields `[]`, which is the full lens.
 */
export const slicesFromDrafts = (
  axisNames: readonly string[],
  shape: readonly number[],
  drafts: Record<string, SliceDraft | undefined>,
): SliceDraftResult => {
  const slices: { axis: string; start?: number; stop?: number; step?: number }[] = [];
  const errors: Record<string, string> = {};

  axisNames.forEach((axis, index) => {
    const draft = drafts[axis];
    if (!draft) return;
    const extent = shape[index];
    const start = parseBound(draft.start);
    const stop = parseBound(draft.stop);
    const step = parseBound(draft.step);

    if (start === "invalid" || stop === "invalid" || step === "invalid") {
      errors[axis] = "Whole numbers only";
      return;
    }
    const from = start ?? 0;
    const to = stop ?? extent;
    if (step === 0) {
      errors[axis] = "Step must be at least 1";
      return;
    }
    if (to > extent) {
      errors[axis] = `Stop is past the extent (${extent})`;
      return;
    }
    if (from >= to) {
      errors[axis] = "Start must be before stop";
      return;
    }
    if (from === 0 && to === extent && (step ?? 1) === 1) return;

    slices.push({
      axis,
      ...(start !== null && { start }),
      ...(stop !== null && { stop }),
      ...(step !== null && step !== 1 && { step }),
    });
  });

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, slices };
};
