import { describe, expect, it } from "vitest";

import { portRequires, queryDeclaresRequires, queryVariables, requiredQueryVariables } from "./constraints";

const SEARCH = `query Search($search: String, $values: [ID!], $requires: [DescriptorConstraintInput!], $limit: Int, $offset: Int = 0) {
  options: lenses(filters: { search: $search, ids: $values, requires: $requires }, pagination: { limit: $limit, offset: $offset }) { value: id label }
}`;

describe("a port's constraints, handed to a search", () => {
  it("drops the cache's __typename, which an input type refuses", () => {
    const port = {
      requires: [
        { __typename: "Requires", key: "@mikro/n_space_axes", operator: "EQUALS", value: 3 },
        { __typename: "Requires", key: "@mikro/n_channels", operator: "LTE", value: 1 },
      ],
    };
    expect(portRequires(port)).toEqual([
      { key: "@mikro/n_space_axes", operator: "EQUALS", value: 3 },
      { key: "@mikro/n_channels", operator: "LTE", value: 1 },
    ]);
  });

  it("is empty for a port that constrains nothing, or for none at all", () => {
    expect(portRequires({ requires: null })).toEqual([]);
    expect(portRequires({})).toEqual([]);
    expect(portRequires(undefined)).toEqual([]);
  });

  it("is asked for by a query that declares $requires", () => {
    expect(queryVariables(SEARCH)).toEqual(["search", "values", "requires", "limit", "offset"]);
    expect(queryDeclaresRequires(SEARCH)).toBe(true);
    expect(queryDeclaresRequires("query S($search: String, $values: [ID!]) { options: things { value: id label: name } }")).toBe(false);
  });

  it("is not asked for by a query that does not parse", () => {
    expect(queryVariables("query {")).toEqual([]);
    expect(queryDeclaresRequires("not graphql")).toBe(false);
  });

  it("knows which variables a query cannot be run without", () => {
    const query = "query S($search: String, $values: [ID!], $dataset: ID!, $limit: Int! = 10, $path: ID) { options: things { value: id label: name } }";
    expect(requiredQueryVariables(query)).toEqual(["dataset"]);
    expect(requiredQueryVariables("query {")).toEqual([]);
  });
});
