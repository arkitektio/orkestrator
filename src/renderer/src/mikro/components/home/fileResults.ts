import { HomeResultsQuery, LineageNodeKind } from "../../api/graphql";

export type ResultNode = HomeResultsQuery["descendants"][number]["nodes"][number];

export type SeriesResults = {
  /** Everything made from the tile's object, nearest first, each once. */
  results: ResultNode[];
  /** Whether the answer was cut short somewhere below it. */
  more: boolean;
};

/**
 * The node key the server gives a root, `<kind>:<id>`: the GraphQL kind
 * lower-cased without its underscores (`TABLE_DATASET` → `tabledataset`), the
 * same keys `lineage` uses.
 */
export const rootKey = (kind: LineageNodeKind, id: string) =>
  `${kind.toLowerCase().replace(/_/g, "")}:${id}`;

/** The `descendants` answer, by root key. */
export const resultsByRoot = (
  descendants: HomeResultsQuery["descendants"],
): Map<string, SeriesResults> =>
  new Map(descendants.map((entry) => [entry.root, { results: entry.nodes, more: entry.more }]));
