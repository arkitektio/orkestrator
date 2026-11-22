import { describe, expect, it } from "vitest";
import type { ListLensFragment } from "@/mikro/api/graphql";
import { isWholeLens } from "@/mikro/lenses";
import { createRefetches } from "./useLiveLenses";

const arrayLens = (slices: { axis: string; start: number; stop: number }[]) =>
  ({ __typename: "ArrayLens", id: "1", slices, dataset: { id: "d", name: "cells" } }) as unknown as ListLensFragment;

describe("createRefetches", () => {
  it("refetches on every create when the page takes any lens", () => {
    expect(createRefetches(arrayLens([{ axis: "y", start: 0, stop: 10 }]))).toBe(true);
  });

  it("skips a crop when only new containers (their whole lens) are news", () => {
    expect(createRefetches(arrayLens([{ axis: "y", start: 0, stop: 10 }]), isWholeLens)).toBe(false);
    expect(createRefetches(arrayLens([]), isWholeLens)).toBe(true);
  });

  it("does nothing for an event that created nothing", () => {
    expect(createRefetches(null)).toBe(false);
    expect(createRefetches(undefined, isWholeLens)).toBe(false);
  });
});
