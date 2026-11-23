import { describe, expect, it } from "vitest";
import { InMemoryCache } from "@apollo/client";
import { parse } from "graphql";
import { collaborationKey, compoundKey, LOK_TYPE_POLICIES, MIKRO_TYPE_POLICIES } from "./cachePolicies";

describe("compoundKey (elektro Cell / Section)", () => {
  it("keys on the compound id, so two models' somas never merge", () => {
    expect(compoundKey({ __typename: "Section", id: "soma", compoundId: "12:pyr:soma" })).toBe(
      "Section:12:pyr:soma",
    );
    expect(compoundKey({ __typename: "Section", id: "soma", compoundId: "13:pyr:soma" })).toBe(
      "Section:13:pyr:soma",
    );
  });

  it("leaves an object without a compound id un-normalized", () => {
    expect(compoundKey({ __typename: "Section", id: "soma" })).toBe(false);
    expect(compoundKey({ __typename: "Cell", id: "pyr", compoundId: null })).toBe(false);
  });
});

describe("collaborationKey (lok and mikro Collaboration)", () => {
  const LOK = parse(`
    query GetCollaboration($id: ID!) {
      collaboration(key: $id) {
        id: key
        lokId: id
        key
        name
      }
    }
  `);
  const MIKRO = parse(`
    query GetCollaboration($id: ID!) {
      collaboration(key: $id) {
        id: key
        name
      }
    }
  `);

  it("keys lok's collaboration by its key, not lok's own id", () => {
    const cache = new InMemoryCache({ typePolicies: LOK_TYPE_POLICIES });
    cache.writeQuery({
      query: LOK,
      variables: { id: "k1" },
      data: { collaboration: { __typename: "Collaboration", id: "k1", lokId: "42", key: "k1", name: "n" } },
    });
    expect(Object.keys(cache.extract())).toContain("Collaboration:k1");
    expect(cache.identify({ __typename: "Collaboration", id: "k1" })).toBe("Collaboration:k1");
  });

  it("keys mikro's row by the key it selects as id, so an evict by the smart object's id finds it", () => {
    const cache = new InMemoryCache({ typePolicies: MIKRO_TYPE_POLICIES });
    cache.writeQuery({
      query: MIKRO,
      variables: { id: "k1" },
      data: { collaboration: { __typename: "Collaboration", id: "k1", name: "n" } },
    });
    expect(Object.keys(cache.extract())).toContain("Collaboration:k1");
    expect(cache.evict({ id: cache.identify({ __typename: "Collaboration", id: "k1" }) })).toBe(true);
  });

  it("leaves an object with neither un-normalized", () => {
    expect(collaborationKey({ __typename: "Collaboration" })).toBe(false);
  });
});
