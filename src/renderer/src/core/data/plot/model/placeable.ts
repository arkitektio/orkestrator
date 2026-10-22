/**
 * Can a view be drawn on the timeline, and if not, what should the UI say?
 *
 * Resolved ONCE here and gated ONCE in `shell/LayerRenderer.tsx` — the R1
 * discipline mikro's `LayerRenderer` follows. Every layer kind then trusts the
 * answer rather than re-deriving it.
 *
 * The inputs are the server's own verdict (`placement`), the composed map
 * (`asAffine`, whose `fields` are the axes an array's values give), and whether
 * the query reported an ERROR at this view's `asAffine`. A view timed by an array
 * instead of a matrix -- an irregularly sampled signal, a variable-time-step run --
 * is PLACED and comes back with `fields`; an error means the path did not
 * compose at all, which is shown with the server's own words. elektro, whose
 * server still errors at `asAffine` for a FIELD step, reads that error as a
 * field itself (`elektroPlaceabilityOf`).
 *
 * Without the error, a null `asAffine` on a PLACED view could only be misread as
 * "unregistered", and the two need opposite affordances: one reads a time array,
 * the other asks someone to author an edge.
 *
 * Structural string enums — no generated imports, so this runs in node.
 */

export type PlacementLike = {
  placement?: string | null;
  placementInvariance?: string | null;
  /** Read structurally: only mikro's carries `fields`. */
  asAffine?: unknown | null;
};

export type Placeability =
  /** Draw it from `asAffine`. */
  | { drawable: true; timeSource: "AFFINE" }
  /**
   * Draw it, reading x from a field's array (R1-T). Not composing a path:
   * reading a field's values is data, not placement arithmetic.
   */
  | { drawable: true; timeSource: "FIELD"; reason: string | null }
  | {
      drawable: false;
      reason:
        /** Registered per index; ask again with `at`. A placement, not a gap. */
        | "conditional"
        /** Nothing relates it to the world yet. A gap to close. */
        | "unregistered"
        /** Can never be placed. A fact to badge — offer no fix. */
        | "unmappable"
        /** PLACED, but the path did not condense and nothing says why. */
        | "uncondensable"
        /** The server's own verdict was missing. */
        | "unknown";
      detail: string | null;
    };

export const placeabilityOf = (
  view: PlacementLike,
  /** The message of a GraphQL error at this view's `asAffine`, if any. */
  asAffineError?: string | null,
): Placeability => {
  switch (view.placement) {
    case "PLACED": {
      if ((view.asAffine as { fields?: readonly unknown[] | null } | null | undefined)?.fields?.length) {
        return { drawable: true, timeSource: "FIELD", reason: null };
      }
      if (view.asAffine) return { drawable: true, timeSource: "AFFINE" };
      // A path exists but did not compose; the server's error names what stopped it.
      return { drawable: false, reason: "uncondensable", detail: asAffineError ?? null };
    }
    case "CONDITIONAL":
      return { drawable: false, reason: "conditional", detail: null };
    case "UNREGISTERED":
      return { drawable: false, reason: "unregistered", detail: null };
    case "UNMAPPABLE":
      return { drawable: false, reason: "unmappable", detail: null };
    default:
      return { drawable: false, reason: "unknown", detail: null };
  }
};

/** The line a card shows under an undrawn view. */
export const unplaceableMessage = (p: Placeability): string | null => {
  if (p.drawable) {
    // Placed, but its x comes from a field's array rather than a sampling law,
    // and that read path is not built yet — say so rather than imply it is on screen.
    return p.timeSource === "FIELD"
      ? "Timed by a field array — not drawn yet"
      : null;
  }
  switch (p.reason) {
    case "conditional":
      return "Placed per index — pick one to draw it";
    case "unregistered":
      return "Not on the timeline yet";
    case "unmappable":
      return "Cannot be placed on this timeline";
    case "uncondensable":
      return "Placement could not be resolved";
    default:
      return "Placement unknown";
  }
};
