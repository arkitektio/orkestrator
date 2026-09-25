/**
 * Which spaces a dataset's pixel grid is registered INTO.
 *
 * The coordinate graph comes back as an undirected neighbourhood with every
 * edge in its true stored direction, so direction is the whole question here.
 * An edge whose INPUT is the grid maps the grid onto something else — a stage
 * frame, a µm calibration, a shared world — and those outputs are the spaces a
 * scene could be composed over. Edges pointing the other way are the dataset's
 * own furniture (a pyramid level or a lens mapping up into the grid, a derived
 * child claiming it as parent) and are not places to put a scene.
 *
 * Pure so the direction rule is testable: getting it backwards produces a
 * plausible-looking list of the dataset's own levels, which is exactly the kind
 * of wrong that survives a glance at the screen.
 */

export type RegistrationEdge = {
  id: string;
  kind?: string | null;
  validity?: string | null;
  inputAxes?: readonly string[] | null;
  outputAxes?: readonly string[] | null;
  input?: { id: string } | null;
  output?: { id: string } | null;
};

export type GraphSystem = { id: string; name: string };

export type DatasetRegistration<
  S extends GraphSystem = GraphSystem,
  E extends RegistrationEdge = RegistrationEdge,
> = {
  /** The space the grid lands in — what a scene would be worlded on. */
  system: S;
  /** The edge that places it there. */
  edge: E;
};

/**
 * The registrations leaving `gridSystemId`, one per target space.
 *
 * Deduplicated by target: two edges into one space (a pixel registration and a
 * calibration are different edges with different correct matrices) would
 * otherwise offer the same scene twice. The FIRST edge wins, matching the
 * server's own "the first edge is the primary parent" ordering.
 */
export const datasetRegistrations = <
  S extends GraphSystem,
  E extends RegistrationEdge,
>(
  gridSystemId: string | undefined,
  systems: readonly S[],
  transformations: readonly E[],
): DatasetRegistration<S, E>[] => {
  if (!gridSystemId) return [];
  const systemById = new Map(systems.map((system) => [system.id, system]));
  const seen = new Set<string>();

  return transformations.flatMap((edge) => {
    if (edge.input?.id !== gridSystemId) return [];
    const targetId = edge.output?.id;
    // A self-edge places nothing; a target the graph did not return cannot be
    // named, and offering "create a scene over ???" helps nobody.
    if (!targetId || targetId === gridSystemId || seen.has(targetId)) return [];
    const system = systemById.get(targetId);
    if (!system) return [];
    seen.add(targetId);
    return [{ system, edge }];
  });
};
