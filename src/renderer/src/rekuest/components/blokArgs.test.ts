import { describe, expect, it } from "vitest";
import { blokArgsSearch, missingBlokArgs, readBlokArgs, seededBlokArgs } from "./blokArgs";

const image = { __identifier: "@mikro/arraydataset", object: "7" };

describe("what a blok is opened for, in its link", () => {
  it("survives the round trip, and the same args are the same link", () => {
    const search = blokArgsSearch({ mask: null, image, bins: 4 });
    expect(readBlokArgs(new URLSearchParams(search))).toEqual({ image, bins: 4 });
    expect(blokArgsSearch({ bins: 4, image })).toBe(search);
    expect(blokArgsSearch({ mask: null })).toBe("");
  });

  it("reads a broken link as no args", () => {
    expect(readBlokArgs(new URLSearchParams("args=%7Bnope"))).toEqual({});
    expect(readBlokArgs(new URLSearchParams("args=%5B1%5D"))).toEqual({});
  });

  it("asks only for the args it cannot open without", () => {
    const ports = [
      { key: "image", nullable: false },
      { key: "mask", nullable: true },
    ];
    expect(missingBlokArgs(ports, {}).map((port) => port.key)).toEqual(["image"]);
    expect(missingBlokArgs(ports, { image })).toEqual([]);
    expect(seededBlokArgs(ports, { image, stray: 1 })).toEqual({ image, mask: null });
  });
});
