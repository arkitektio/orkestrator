// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SparseHopLike } from "../attributes/attributeTypes";
import { sparseHop, sparsePlan } from "../attributes/__fixtures__/plans";
import { createSparseProfileReader, profileLayoutChoice, profileState, runAsProfile } from "./sparseProfile";

const mocks = vi.hoisted(() => ({
  openSparseLayout: vi.fn(),
  readSparseSlice: vi.fn(),
}));

vi.mock("./sparseSlice", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./sparseSlice")>();
  return {
    ...actual,
    openSparseLayout: mocks.openSparseLayout,
    readSparseSlice: mocks.readSparseSlice,
  };
});

const client = {} as never;
const plan = sparsePlan();
const hop = plan.hops[0] as SparseHopLike;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.openSparseLayout.mockImplementation(async (_c, _d, choice) => ({ choice, indptr: new Int32Array([0, 3, 5]), slotCount: 50 }));
  mocks.readSparseSlice.mockImplementation(async (_h, position: number) =>
    position === 1
      ? { indices: new Int32Array([7, 2, 9]), values: new Float32Array([0.5, 4, 2]) }
      : { indices: new Int32Array([]), values: new Float32Array([]) },
  );
});

describe("profileLayoutChoice", () => {
  it("names the layout the plan points at, indexed on the object axis, valued per feature", () => {
    const choice = profileLayoutChoice(hop);
    expect("error" in choice).toBe(false);
    if ("error" in choice) return;
    expect(choice.layout.path).toBe("layouts/axis0");
    expect(choice.indexedAxis).toBe(0);
    expect(choice.objectAxis).toBe(1); // gene: what a profile returns a value per
  });

  it("refuses a missing layout and a byte-addressable one", () => {
    const missing = sparseHop({ lookup: { ...hop.lookup, sparseArray: { ...hop.lookup.sparseArray, path: "layouts/nope" } } });
    expect(profileLayoutChoice(missing)).toMatchObject({ error: expect.stringContaining("no layout at") });
    const addressable = sparseHop({
      lookup: {
        ...hop.lookup,
        sparseArray: {
          ...hop.lookup.sparseArray,
          store: {
            ...hop.lookup.sparseArray.store,
            layouts: hop.lookup.sparseArray.store.layouts.map((layout) => ({ ...layout, rangeReadable: true })),
          },
        },
      },
    });
    expect(profileLayoutChoice(addressable)).toMatchObject({ error: expect.stringContaining("byte-addressable") });
  });
});

describe("runAsProfile / profileState", () => {
  it("sorts by value, descending, and caps with a truncation note", () => {
    const profile = runAsProfile(hop, { indexOrder: [1] }, { indices: [7, 2, 9], values: [0.5, 4, 2] });
    expect(profile.entries.map((entry) => [entry.position, entry.value])).toEqual([
      [2, 4],
      [9, 2],
      [7, 0.5],
    ]);
    const state = profileState(hop, profile, 2);
    expect(state).toEqual({
      status: "rows",
      rows: [
        { position: 2, value: 4, gene: 2 },
        { position: 9, value: 2, gene: 9 },
      ],
      truncated: { shown: 2, total: 3 },
    });
    expect(profileState(hop, profile, 10).truncated).toBeUndefined();
  });

  it("unravels a rank-three run into one coordinate per value axis", () => {
    const rank3 = sparseHop({
      sparseDataset: { ...hop.sparseDataset, axisNames: ["cell", "metabolite", "adduct"], shape: [10, 5, 4] },
      lookup: { ...hop.lookup, valueAxes: ["metabolite", "adduct"] },
    });
    // Raveled over (metabolite, adduct) in C order: 3*4 + 1 = 13 → (3, 1).
    const profile = runAsProfile(rank3, { indexOrder: [1, 2] }, { indices: [13], values: [8] });
    expect(profile.entries[0]).toEqual({ position: 3, coords: [3, 1], value: 8 });
    expect(profileState(rank3, profile, 5).rows[0]).toEqual({ position: 3, value: 8, metabolite: 3, adduct: 1 });
  });
});

describe("createSparseProfileReader", () => {
  it("reads once per (hop, id), re-slices per limit, and peeks synchronously afterwards", async () => {
    const reader = createSparseProfileReader({ client, datalayer: "http://dl" });
    expect(reader.peek(plan, hop, 1, 2)).toBeNull();
    const state = await reader.read(plan, hop, 1, { limit: 2 });
    expect(state).toMatchObject({ status: "rows", truncated: { shown: 2, total: 3 } });
    expect(state?.rows.map((row) => row.position)).toEqual([2, 9]);
    expect(mocks.readSparseSlice).toHaveBeenCalledTimes(1);

    const wider = await reader.read(plan, hop, 1, { limit: 10 });
    expect(wider?.rows).toHaveLength(3);
    expect(mocks.readSparseSlice).toHaveBeenCalledTimes(1);
    expect(reader.peek(plan, hop, 1, 2)).toBe(state);
    expect(reader.peek(plan, hop, 1n, 3)?.rows).toHaveLength(3);
  });

  it("turns a bad id, a bad layout and a failed read into error states, never rejections", async () => {
    const reader = createSparseProfileReader({ client, datalayer: "http://dl" });
    expect(await reader.read(plan, hop, -1, { limit: 5 })).toMatchObject({ status: "error" });
    expect(await reader.read(plan, hop, 2n ** 60n, { limit: 5 })).toMatchObject({ status: "error" });
    const missing = sparseHop({ lookup: { ...hop.lookup, sparseArray: { ...hop.lookup.sparseArray, path: "nope" } } });
    expect(await reader.read(plan, missing, 1, { limit: 5 })).toMatchObject({ status: "error" });
    mocks.readSparseSlice.mockRejectedValueOnce(new Error("position 99 is outside"));
    expect(await reader.read(plan, hop, 99, { limit: 5 })).toMatchObject({ status: "error", error: expect.stringContaining("99") });
    // A failed read does not stick: the next ask reads again.
    mocks.readSparseSlice.mockResolvedValueOnce({ indices: [1], values: [1] });
    expect(await reader.read(plan, hop, 99, { limit: 5 })).toMatchObject({ status: "rows" });
  });

  it("drops a stale read and answers an empty profile as no rows", async () => {
    const reader = createSparseProfileReader({ client, datalayer: "http://dl" });
    expect(await reader.read(plan, hop, 1, { limit: 5, isStale: () => true })).toBeNull();
    expect(await reader.read(plan, hop, 0, { limit: 5 })).toEqual({ status: "rows", rows: [] });
  });

  it("warm opens the layout and swallows its failure", async () => {
    const reader = createSparseProfileReader({ client, datalayer: "http://dl" });
    mocks.openSparseLayout.mockRejectedValueOnce(new Error("no grant"));
    reader.warm(plan, hop);
    await Promise.resolve();
    expect(mocks.openSparseLayout).toHaveBeenCalledTimes(1);
  });
});
