// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  DemandKind as KabinetDemandKind,
  PortKind as KabinetPortKind,
} from "@/kabinet/api/graphql";
import { DemandKind, PortKind } from "@/rekuest/api/graphql";
import { buildDemands, buildImplementationDemand, demandKey } from "./demands";

const image = (id: string) => ({ identifier: "@mikro/image", id });
const dataset = (id: string) => ({ identifier: "@mikro/dataset", id });

const hasUndefined = (value: unknown): boolean =>
  value === undefined ||
  (Array.isArray(value) && value.some(hasUndefined)) ||
  (typeof value === "object" && value !== null && Object.values(value).some(hasUndefined));

describe("demandKey", () => {
  it("is stable across new-but-equal inputs and changes with what the demands read", () => {
    expect(demandKey({ objects: [image("1")] })).toBe(demandKey({ objects: [image("9")] }));
    expect(demandKey({ objects: [image("1"), image("2")] })).toBe(
      demandKey({ objects: [image("1"), image("2"), image("3")] }),
    );
    expect(demandKey({ objects: [image("1")] })).not.toBe(demandKey({ objects: [image("1"), image("2")] }));
    expect(demandKey({ objects: [image("1")] })).not.toBe(demandKey({ objects: [dataset("1")] }));
    expect(demandKey({ objects: [image("1")] })).not.toBe(
      demandKey({ objects: [image("1")], partners: [dataset("1")] }),
    );
    expect(demandKey({ objects: [image("1")] })).not.toBe(
      demandKey({ objects: [image("1")], returns: ["@mikro/metric"] }),
    );
  });
});

describe("buildDemands", () => {
  it("asks for one structure at arg 0 for a single object", () => {
    const demands = buildDemands({ objects: [image("1")] });
    expect(demands.objects).toBe("one");
    expect(demands.single).toEqual([
      { kind: DemandKind.Args, matches: [{ at: 0, kind: PortKind.Structure, identifier: "@mikro/image" }] },
    ]);
    expect(demands.batch).toEqual(demands.single);
  });

  it("asks for a list at arg 0 for many objects, but a single structure in the batch form", () => {
    const demands = buildDemands({ objects: [image("1"), image("2")] });
    expect(demands.single).toEqual([
      {
        kind: DemandKind.Args,
        matches: [
          { at: 0, kind: PortKind.List, children: [{ at: 0, kind: PortKind.Structure, identifier: "@mikro/image" }] },
        ],
      },
    ]);
    expect(demands.batch).toEqual([
      { kind: DemandKind.Args, matches: [{ at: 0, kind: PortKind.Structure, identifier: "@mikro/image" }] },
    ]);
  });

  it("puts partners at arg 1, with the list child at index 0 for many", () => {
    const demands = buildDemands({ objects: [image("1")], partners: [dataset("1"), dataset("2")] });
    expect(demands.single[1]).toEqual({
      kind: DemandKind.Args,
      matches: [
        { at: 1, kind: PortKind.List, children: [{ at: 0, kind: PortKind.Structure, identifier: "@mikro/dataset" }] },
      ],
    });
  });

  it("adds a returns demand and derives the implementation demand lengths", () => {
    const demands = buildDemands({ objects: [image("1")], partners: [dataset("1")], returns: ["@mikro/metric"] });
    expect(demands.single[2]).toEqual({
      kind: DemandKind.Returns,
      matches: [{ at: 0, kind: PortKind.Structure, identifier: "@mikro/metric" }],
    });
    expect(demands.implementation).toEqual({
      argMatches: [
        { at: 0, kind: PortKind.Structure, identifier: "@mikro/image" },
        { at: 1, kind: PortKind.Structure, identifier: "@mikro/dataset" },
      ],
      forceArgLength: 2,
      returnMatches: [{ at: 0, kind: PortKind.Structure, identifier: "@mikro/metric" }],
      forceReturnLength: 1,
    });
    expect(buildImplementationDemand([])).toEqual({});
  });

  it("never emits an undefined-valued key", () => {
    const demands = buildDemands({ objects: [image("1"), image("2")], partners: [dataset("1")] });
    expect(hasUndefined(demands.single)).toBe(false);
    expect(hasUndefined(demands.batch)).toBe(false);
    expect(hasUndefined(demands.implementation)).toBe(false);
  });

  it("builds nothing for no objects", () => {
    const demands = buildDemands({ objects: [] });
    expect(demands.objects).toBe("none");
    expect(demands.single).toEqual([]);
  });
});

describe("kabinet enums", () => {
  it("share the rekuest values, which is what lets the demands be reused", () => {
    expect(KabinetDemandKind.Args).toBe(DemandKind.Args);
    expect(KabinetDemandKind.Returns).toBe(DemandKind.Returns);
    expect(KabinetPortKind.Structure).toBe(PortKind.Structure);
    expect(KabinetPortKind.List).toBe(PortKind.List);
  });
});

describe("descriptors", () => {
  const withAxes = (id: string, axes: string[]) => ({
    identifier: "@mikro/image",
    id,
    descriptors: { axes },
  });

  it("sends what one structure provides with its match", () => {
    const [args] = buildDemands({ objects: [withAxes("1", ["c", "z"])] }).single;
    expect(args.matches?.[0]).toEqual({
      at: 0,
      kind: PortKind.Structure,
      identifier: "@mikro/image",
      descriptors: [{ key: "axes", value: ["c", "z"] }],
    });
  });

  it("sends a list's descriptors only when every item agrees", () => {
    const agree = buildDemands({ objects: [withAxes("1", ["z"]), withAxes("2", ["z"])] }).single;
    expect(agree[0].matches?.[0].children?.[0].descriptors).toEqual([{ key: "axes", value: ["z"] }]);

    const disagree = buildDemands({ objects: [withAxes("1", ["z"]), withAxes("2", ["t"])] }).single;
    expect(disagree[0].matches?.[0].children?.[0]).not.toHaveProperty("descriptors");
  });

  it("keys on descriptors, but not on their key order", () => {
    const a = { identifier: "@mikro/image", id: "1", descriptors: { axes: ["z"], dtype: "u8" } };
    const b = { identifier: "@mikro/image", id: "2", descriptors: { dtype: "u8", axes: ["z"] } };
    expect(demandKey({ objects: [a] })).toBe(demandKey({ objects: [b] }));
    expect(demandKey({ objects: [a] })).not.toBe(demandKey({ objects: [image("1")] }));
  });

  it("leaves a structure without descriptors purely structural", () => {
    const [args] = buildDemands({ objects: [image("1")] }).single;
    expect(args.matches?.[0]).not.toHaveProperty("descriptors");
  });
});
