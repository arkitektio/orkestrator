import { KRAPH_TYPE_POLICIES } from "@/core/connection/graphql/cachePolicies";
import { InMemoryCache } from "@apollo/client";
import { describe, expect, it } from "vitest";
import kraphResult from "./fragments";
import { ColumnKind, RenderGraphTableDocument, type RenderGraphTableQuery, type RenderGraphTableQueryVariables } from "./graphql";

const render: RenderGraphTableQuery = {
  renderGraphTable: {
    __typename: "GraphTableRender",
    rows: [{ id: "a", length: 1 }, { id: "b", length: 2 }],
    query: {
      __typename: "GraphTableQuery",
      columns: [
        {
          __typename: "Column",
          key: "length",
          valueKind: null,
          label: "Length",
          kind: ColumnKind.Value,
          description: null,
          categoryKey: null,
          searchable: false,
          isIdForKey: null,
          preferHidden: false,
        },
      ],
      graph: { __typename: "Graph", id: "g1", ageName: "g1" },
    },
  },
};

const roundTrip = (variables: RenderGraphTableQueryVariables) => {
  const cache = new InMemoryCache({ possibleTypes: kraphResult.possibleTypes, typePolicies: KRAPH_TYPE_POLICIES });
  cache.writeQuery({ query: RenderGraphTableDocument, variables, data: render });
  return cache.readQuery<RenderGraphTableQuery, RenderGraphTableQueryVariables>({ query: RenderGraphTableDocument, variables });
};

/**
 * `renderGraphTable` answers one object (rows and columns), not a list, so the
 * offset-pagination merge must not apply to it: it stored a page as `[]` and
 * threw on a render without a page (the scatter plot's).
 */
describe("renderGraphTable in kraph's cache", () => {
  it("reads a paged render back as the render it was", () => {
    const read = roundTrip({ id: "q1", pagination: { limit: 20, offset: 0 } });
    expect(read?.renderGraphTable?.rows).toEqual(render.renderGraphTable?.rows);
    expect(read?.renderGraphTable?.query.columns.map((column) => column.key)).toEqual(["length"]);
  });

  it("keeps an unpaged render (a scatter plot's) as well", () => {
    const read = roundTrip({ id: "q1" });
    expect(read?.renderGraphTable?.rows).toHaveLength(2);
  });
});
