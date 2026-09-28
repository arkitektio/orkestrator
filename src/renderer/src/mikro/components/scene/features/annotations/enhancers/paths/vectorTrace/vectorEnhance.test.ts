import { describe, expect, it } from "vitest";
import { closingInsert, hopExtension } from "./vectorEnhance";

describe("hopExtension", () => {
  it("drops only the duplicated start of a straight (2-point) hop", () => {
    expect(hopExtension(["a", "b"])).toEqual(["b"]);
  });

  it("keeps every found point plus the end of a dense hop", () => {
    expect(hopExtension(["a", "m1", "m2", "b"])).toEqual(["m1", "m2", "b"]);
  });
});

describe("closingInsert", () => {
  it("inserts nothing for a straight closing hop — the fallback closure", () => {
    expect(closingInsert(["last", "first"])).toEqual([]);
  });

  it("inserts the single interior point of a 3-point hop", () => {
    expect(closingInsert(["last", "m", "first"])).toEqual(["m"]);
  });

  it("inserts all interior points of a dense hop, endpoints dropped", () => {
    expect(closingInsert(["last", "m1", "m2", "m3", "first"])).toEqual([
      "m1",
      "m2",
      "m3",
    ]);
  });
});
