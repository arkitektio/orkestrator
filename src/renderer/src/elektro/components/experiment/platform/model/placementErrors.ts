/**
 * Mapping the scene query's GraphQL errors back to the layers they belong to.
 *
 * The experiment scene query runs with `errorPolicy: "all"`, because
 * `ExperimentLayer.asAffine` ERRORS (rather than nulling) when a layer's path
 * will not condense. Apollo then hands back the data with that one field nulled,
 * plus the error — whose `path` is where in the response it happened:
 *
 *     ["experiment", "layers", 3, "asAffine"]
 *
 * That index is into the RESPONSE array, so it is resolved against the same
 * fragment the page received, not against any sorted or filtered copy.
 *
 * The error message names the transformation that stopped the composition, which
 * is worth showing: "timed by a lookup (FieldTransformation 42)" is a fact a user
 * can act on.
 *
 * No generated imports — errors are taken structurally.
 */

export type GraphQLErrorLike = {
  message: string;
  path?: readonly (string | number)[] | null;
};

/** Layer id → the message of the error at that layer's `asAffine`. */
export const placementErrorsByLayerId = (
  experiment: { layers?: readonly { id: string }[] | null } | null | undefined,
  errors: readonly GraphQLErrorLike[] | null | undefined,
): Map<string, string> => {
  const out = new Map<string, string>();
  if (!experiment || !errors) return out;

  for (const error of errors) {
    const path = error.path;
    if (!path) continue;
    // Find the layers segment wherever the query nests it.
    const at = path.indexOf("layers");
    if (at < 0) continue;
    const index = path[at + 1];
    if (typeof index !== "number") continue;
    // Only placement errors: a failure deep inside a lens is not a placement fact.
    if (path[at + 2] !== "asAffine") continue;

    const layer = experiment.layers?.[index];
    if (layer) out.set(layer.id, error.message);
  }
  return out;
};
