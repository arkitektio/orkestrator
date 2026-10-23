/**
 * Collapsing the coordinate graph to its distinct shapes.
 *
 * A walk around one tile on a stage comes back as the stage frame plus every
 * other tile registered into it, each with its own grid, its own calibration
 * and its own pyramid levels — the same little chain drawn a hundred times. The
 * simplified view draws that chain once and says how many there are.
 *
 * Two systems are "the same" when nothing in the graph tells them apart: same
 * axes, same kinds of residents, and the same transformations (kind AND
 * numbers, compared exactly) to systems that are themselves the same. That last
 * clause is recursive, so this is colour refinement (1-dimensional
 * Weisfeiler–Leman): start from what a system is on its own, then repeatedly
 * split any class whose members see different neighbourhoods, until nothing
 * splits. The root is always a class of its own — it is the anchor of the
 * picture and must stay findable.
 *
 * Pure and node-free, so it is tested on plain objects (simplify.test.ts).
 */

type SystemLike = {
  id: string;
  axes: readonly { name: string; unit?: string | null; order: number }[];
  residents: readonly { __typename: string }[];
};

type TransformationLike = {
  input?: { id: string } | null;
  output?: { id: string } | null;
};

export type GraphLike = {
  root: { id: string };
  systems: readonly SystemLike[];
  transformations: readonly TransformationLike[];
};

// Which keys say WHERE a transformation sits rather than WHAT it does. A
// composite's steps carry their own, so these are dropped at every depth.
const POSITIONAL = new Set(["id", "name", "input", "output"]);

const isTransformation = (value: Record<string, unknown>) =>
  typeof value.__typename === "string" &&
  value.__typename.endsWith("Transformation");

const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const strip = isTransformation(record);
    return Object.keys(record)
      .filter((key) => !(strip && POSITIONAL.has(key)))
      .sort()
      .map((key) => [key, canonical(record[key])]);
  }
  return value;
};

/**
 * What a transformation does, as a string two equal maps share: its kind, axes,
 * validity and numbers, without its id, name or endpoints.
 */
export const transformationKey = (transformation: object): string =>
  JSON.stringify(canonical(transformation));

/**
 * Each system's class: systems with the same class are interchangeable in the
 * picture. Class ids are arbitrary but stable for one input.
 */
export const partitionSystems = (graph: GraphLike): Map<string, number> => {
  const known = new Set(graph.systems.map((system) => system.id));
  const edges = graph.transformations.flatMap((transformation) => {
    const input = transformation.input?.id;
    const output = transformation.output?.id;
    if (!input || !output || !known.has(input) || !known.has(output)) return [];
    return [{ input, output, key: transformationKey(transformation) }];
  });

  const intern = (signatures: Map<string, string>) => {
    const ids = new Map<string, number>();
    const classes = new Map<string, number>();
    for (const [system, signature] of signatures) {
      if (!ids.has(signature)) ids.set(signature, ids.size);
      classes.set(system, ids.get(signature)!);
    }
    return { classes, count: ids.size };
  };

  let { classes, count } = intern(
    new Map(
      graph.systems.map((system) => [
        system.id,
        JSON.stringify([
          system.id === graph.root.id ? system.id : "",
          [...system.axes]
            .sort((a, b) => a.order - b.order)
            .map((axis) => `${axis.name}:${axis.unit ?? ""}`),
          system.residents.map((resident) => resident.__typename).sort(),
        ]),
      ]),
    ),
  );

  // Every round either splits a class or ends the loop, so it runs at most once
  // per system — in practice two or three times.
  for (;;) {
    const seen = new Map<string, string[]>(
      graph.systems.map((system) => [system.id, []]),
    );
    for (const edge of edges) {
      seen.get(edge.input)!.push(`out ${edge.key} ${classes.get(edge.output)}`);
      seen.get(edge.output)!.push(`in ${edge.key} ${classes.get(edge.input)}`);
    }
    const next = intern(
      new Map(
        [...seen].map(([system, neighbourhood]) => [
          system,
          JSON.stringify([classes.get(system), neighbourhood.sort()]),
        ]),
      ),
    );
    if (next.count === count) return classes;
    ({ classes, count } = next);
  }
};
