// @vitest-environment jsdom
// The graphql module this pulls in reaches `window` at import time.
import { describe, expect, it } from "vitest";
import { PortKind } from "../api/graphql";
import { firstReturnedStructure } from "./firstReturn";

const ports = [
  { key: "count", kind: PortKind.String },
  { key: "mask", kind: PortKind.Structure, identifier: "@mikro/arraydataset" },
  { key: "table", kind: PortKind.Structure, identifier: "@mikro/tabledataset" },
];

describe("firstReturnedStructure", () => {
  it("links the first structure the run returned, by port order", () => {
    expect(firstReturnedStructure(ports, { count: 3, mask: "12", table: "7" })).toMatchObject({
      identifier: "@mikro/arraydataset",
      id: "12",
    });
  });

  it("skips a structure port the run left empty", () => {
    expect(firstReturnedStructure(ports, { mask: null, table: 7 })).toMatchObject({
      identifier: "@mikro/tabledataset",
      id: "7",
    });
  });

  it("links nothing without a returned structure", () => {
    expect(firstReturnedStructure(ports, null)).toBeNull();
    expect(firstReturnedStructure(ports, { count: 3 })).toBeNull();
    expect(firstReturnedStructure([], { mask: "12" })).toBeNull();
  });
});
