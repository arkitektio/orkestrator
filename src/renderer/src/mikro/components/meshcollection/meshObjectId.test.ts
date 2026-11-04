import { describe, expect, it } from "vitest";

import { parseMeshObjectId } from "./meshObjectId";

describe("parseMeshObjectId", () => {
  it("splits a collection and an object id", () => {
    expect(parseMeshObjectId("12:7")).toEqual({ collection: "12", object: 7 });
  });

  it("is null for anything else", () => {
    expect(parseMeshObjectId("12")).toBeNull();
    expect(parseMeshObjectId(":7")).toBeNull();
    expect(parseMeshObjectId("12:")).toBeNull();
    expect(parseMeshObjectId("12:seven")).toBeNull();
    expect(parseMeshObjectId("12:7.5")).toBeNull();
  });
});
