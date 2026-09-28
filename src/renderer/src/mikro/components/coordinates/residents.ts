/**
 * Describing a coordinate system now that `kind` is gone.
 *
 * A system no longer declares what it is. The schema is explicit about why:
 * an empty `residents` is what a pure reference frame — a world, an atlas — *is*,
 * "and there is no separate kind to consult". So the vocabulary is a binary plus
 * a list:
 *
 *   no residents   a reference frame. Sources register INTO it and scenes adopt
 *                  it as their world; it is shared and outlives each of them.
 *   has residents  the grid, calibration or native space of the containers
 *                  listed. Several may share one space — a dataset's pyramid
 *                  levels and unsliced lenses all live in its grid, and a
 *                  hundred tiles acquired on one stage sit in one stage frame.
 *
 * Kept free of the four old kinds deliberately: INTRINSIC vs PHYSICAL is no
 * longer derivable client-side (a calibration has the same dataset as a resident
 * that its pixel grid does), so anything claiming to recover it would be lying.
 */

/** The narrowest shape these helpers need — anything with `__typename`. */
export type ResidentLike = { __typename: string };

/** A system as far as this module cares: just who lives in it. */
export type InhabitedLike<R extends ResidentLike = ResidentLike> = {
  residents: readonly R[];
};

/**
 * A pure reference frame: nothing lives here, so it exists to be registered
 * into rather than to hold anything of its own.
 */
export const isReferenceFrame = (system: InhabitedLike): boolean =>
  system.residents.length === 0;

/**
 * What to call one resident.
 *
 * A Lens has no name of its own so it borrows its dataset's; a DataArray has
 * neither a name nor a back-reference to its dataset, so a pyramid level can
 * name only its level; a MeshCollection has only a version. Takes the widened
 * fragment shape rather than the generated union so the fields it reaches for
 * are optional — a caller holding only `{ __typename }` still gets a sane
 * answer instead of a crash.
 */
export const residentName = (
  resident: ResidentLike & {
    name?: string | null;
    level?: number | null;
    version?: string | null;
    dataset?: { name?: string | null } | null;
  },
): string => {
  switch (resident.__typename) {
    case "Lens":
      return resident.dataset?.name
        ? `a lens of ${resident.dataset.name}`
        : "a lens";
    case "DataArray":
      return `pyramid level ${resident.level ?? "?"}`;
    case "MeshCollection":
      return `mesh collection ${resident.version ?? ""}`.trim();
    default:
      return resident.name ?? resident.__typename;
  }
};

/**
 * The one-line badge a card, node or picker shows in place of the old `kind`.
 *
 * Names the single resident when there is one — that is the case where the
 * space has a story worth telling ("the grid of dataset X") — and falls back to
 * a count when several share it, since listing them would not fit a badge.
 */
export const residentLabel = <R extends ResidentLike>(
  system: InhabitedLike<R>,
): string => {
  const [first, ...rest] = system.residents;
  if (!first) return "reference frame";
  if (rest.length === 0) return residentName(first);
  return occupancyLabel(system);
};

/**
 * The same badge for callers holding only the ListCoordinateSystem fragment,
 * which fetches `residents { __typename }` and no names — a count is all it
 * can honestly say, so it never pretends otherwise.
 */
export const occupancyLabel = (system: InhabitedLike): string => {
  const count = system.residents.length;
  if (count === 0) return "reference frame";
  return `${count} ${count === 1 ? "resident" : "residents"}`;
};

