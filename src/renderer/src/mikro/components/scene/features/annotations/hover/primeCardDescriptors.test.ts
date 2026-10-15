import { InMemoryCache } from "@apollo/client";
import { describe, expect, it } from "vitest";

import { GetAnnotationActionDescriptorsDocument } from "@/mikro/api/graphql";
import { primeCardDescriptors } from "./primeCardDescriptors";

describe("primeCardDescriptors", () => {
  it("answers the card's query for the drawn shape and the probed lens, and no other lens", () => {
    const cache = new InMemoryCache();
    primeCardDescriptors(
      cache,
      { id: "ann:1", descriptors: { "@mikro/annotation_kind": "RECTANGLE" }, descriptorsUnder: { "@mikro/spec": ["IMAGE"] } },
      "7",
    );

    const read = (lens: string) =>
      cache.readQuery({ query: GetAnnotationActionDescriptorsDocument, variables: { id: "ann:1", lens } });
    expect(read("7")?.annotation).toMatchObject({
      id: "ann:1",
      descriptors: { "@mikro/annotation_kind": "RECTANGLE" },
      descriptorsUnder: { "@mikro/spec": ["IMAGE"] },
    });
    expect(read("9")).toBeNull();
  });

  it("keeps a missed crop as an answer, not as a gap", () => {
    const cache = new InMemoryCache();
    primeCardDescriptors(cache, { id: "ann:1", descriptors: {}, descriptorsUnder: null }, "7");
    expect(
      cache.readQuery({ query: GetAnnotationActionDescriptorsDocument, variables: { id: "ann:1", lens: "7" } })?.annotation
        .descriptorsUnder,
    ).toBeNull();
  });
});
