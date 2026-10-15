import { InMemoryCache } from "@apollo/client";
import { describe, expect, it } from "vitest";
import { MIKRO_TYPE_POLICIES } from "@/core/connection/graphql/cachePolicies";
import {
  GetLineageDocument,
  GetLineageQuery,
  GetLineageQueryVariables,
  LineageNodeKind,
} from "@/mikro/api/graphql";
import mikroResult from "@/mikro/api/fragments";

const node = (kind: LineageNodeKind, id: string, depth: number) => ({
  __typename: "LineageNode" as const,
  key: `${kind}:${id}`,
  kind,
  id,
  name: `${kind} ${id}`,
  depth,
  createdAt: null,
  taskId: null,
  hasMoreUp: false,
  hasMoreDown: false,
  lensCount: 0,
  lenses: [],
  axes: [],
  dtype: null,
  levels: 0,
});

const answer = (root: string, nodes: ReturnType<typeof node>[]): GetLineageQuery => ({
  lineage: { __typename: "Lineage", root, truncated: false, nodes, edges: [] },
});

const write = (cache: InMemoryCache, variables: GetLineageQueryVariables, data: GetLineageQuery) =>
  cache.writeQuery({ query: GetLineageDocument, variables, data });

const read = (cache: InMemoryCache, variables: GetLineageQueryVariables) =>
  cache.readQuery<GetLineageQuery, GetLineageQueryVariables>({ query: GetLineageDocument, variables });

describe("the lineage in mikro's cache", () => {
  it("keeps a file and a dataset sharing an id apart, and one walk's depths out of another", () => {
    const cache = new InMemoryCache({ possibleTypes: mikroResult.possibleTypes, typePolicies: MIKRO_TYPE_POLICIES });
    const fromFile = { start: { kind: LineageNodeKind.File, id: "4" }, up: 1, down: 3 };
    const fromDataset = { start: { kind: LineageNodeKind.Dataset, id: "4" }, up: 1, down: 3 };

    write(cache, fromFile, answer("FILE:4", [node(LineageNodeKind.File, "4", 0), node(LineageNodeKind.Dataset, "4", 1)]));
    write(cache, fromDataset, answer("DATASET:4", [node(LineageNodeKind.Dataset, "4", 0), node(LineageNodeKind.File, "4", -1)]));

    expect(read(cache, fromFile)?.lineage.nodes.map((n) => [n.kind, n.depth])).toEqual([
      [LineageNodeKind.File, 0],
      [LineageNodeKind.Dataset, 1],
    ]);
    expect(read(cache, fromDataset)?.lineage.nodes.map((n) => [n.kind, n.depth])).toEqual([
      [LineageNodeKind.Dataset, 0],
      [LineageNodeKind.File, -1],
    ]);
  });
});
