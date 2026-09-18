/**
 * Can a view be drawn on the timeline, and if not, what should the UI say?
 *
 * Resolved ONCE here and gated ONCE in `shell/LayerRenderer.tsx` — the R1
 * discipline mikro's `LayerRenderer` follows. Every layer kind then trusts the
 * answer rather than re-deriving it.
 *
 * The inputs are the server's own verdict (`placement`), the composed map
 * (`asAffine`), the geometry class of the path (`placementInvariance`), and whether
 * the scene query reported an ERROR at this view's `asAffine`. That last one is the
 * reason this is not a one-liner: `asAffine` errors rather than nulls when a path
 * exists but will not condense — a FIELD step, which is every spike train,
 * irregularly sampled signal, and variable-time-step run. Those views are PLACED
 * and drawable; they are just timed by a lookup array instead of a matrix.
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
  asAffine?: unknown | null;
};

export type Placeability =
  /** Draw it from `asAffine`. */
  | { drawable: true; timeSource: "AFFINE" }
  /**
   * Draw it, reading x from a time-lookup array (R1-T). Not composing a path:
   * reading a FIELD's values is data, not placement arithmetic.
   */
  | { drawable: true; timeSource: "LOOKUP"; reason: string | null }
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
      if (view.asAffine) return { drawable: true, timeSource: "AFFINE" };
      // A path exists but did not condense. The server errors in exactly this
      // case, naming the transformation that stopped it — and a DIFFEOMORPHIC
      // path is precisely one that crosses a time lookup.
      if (asAffineError || view.placementInvariance === "DIFFEOMORPHIC") {
        return {
          drawable: true,
          timeSource: "LOOKUP",
          reason: asAffineError ?? null,
        };
      }
      return { drawable: false, reason: "uncondensable", detail: null };
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
    // Placed, but its x comes from a time array rather than a sampling law, and
    // that read path is not built yet — say so rather than imply it is on screen.
    return p.timeSource === "LOOKUP"
      ? "Timed by a lookup array — not drawn yet"
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
