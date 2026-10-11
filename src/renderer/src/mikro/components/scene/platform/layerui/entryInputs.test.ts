// @vitest-environment jsdom
// (`columnOptions.ts` imports enums from the generated `graphql.ts`, whose
// Apollo hooks barrel touches `window` on load)
import { describe, expect, it, vi } from "vitest";
import { ColorMap, ColorSourceKind } from "@/mikro/api/graphql";
import type { LensRegistry } from "@/mikro/lib/lenses/lensRegistry";
import type { ColorByInputLike, FilterByInputLike } from "./columnOptions";
import { colorByEntryToInput } from "./columnOptions";
import { resolveEntryInputs } from "./entryInputs";

/** A registry that mints one lens per distinct position. */
const registryOf = () => {
  const ensureSparseLens = vi.fn(
    async (dataset: string, at: readonly { axis: string; value: number }[]) =>
      `lens:${dataset}:${at.map((position) => `${position.axis}=${position.value}`).join(",")}`,
  );
  return { ensureSparseLens } as unknown as LensRegistry & {
    ensureSparseLens: typeof ensureSparseLens;
  };
};

const columnDraft: ColorByInputLike = {
  kind: ColorSourceKind.Column,
  table: "t1",
  column: "area",
  joinPath: [],
  colormap: ColorMap.Viridis,
};

const sparseDraft = (value: number): ColorByInputLike => ({
  kind: ColorSourceKind.Sparse,
  dataset: "matrix-1",
  at: [{ axis: "gene", value }],
  colormap: ColorMap.Magma,
  label: "counts",
  joinPath: [],
});

describe("resolveEntryInputs", () => {
  it("sends a sparse draft as its lens, and never its client-only position", async () => {
    const registry = registryOf();
    const { colorBys } = await resolveEntryInputs(registry, { colorBys: [sparseDraft(7)] });
    expect(colorBys).toHaveLength(1);
    expect(colorBys?.[0].lens).toBe("lens:matrix-1:gene=7");
    // GraphQL refuses a mutation over ONE unknown input key.
    expect(Object.keys(colorBys?.[0] ?? {})).not.toContain("dataset");
    expect(Object.keys(colorBys?.[0] ?? {})).not.toContain("at");
  });

  it("asks nothing for a picker without sparse entries", async () => {
    const registry = registryOf();
    const { colorBys } = await resolveEntryInputs(registry, { colorBys: [columnDraft] });
    expect(registry.ensureSparseLens).not.toHaveBeenCalled();
    expect(colorBys?.[0]).toMatchObject({ table: "t1", column: "area", lens: null });
  });

  it("asks once for a position two entries share", async () => {
    const registry = registryOf();
    const rule: FilterByInputLike = {
      kind: ColorSourceKind.Sparse,
      dataset: "matrix-1",
      at: [{ axis: "gene", value: 7 }],
      joinPath: [],
      min: 0,
      max: 9,
      exclude: false,
    };
    const result = await resolveEntryInputs(registry, {
      colorBys: [sparseDraft(7)],
      filterBys: [rule],
    });
    expect(registry.ensureSparseLens).toHaveBeenCalledTimes(1);
    expect(result.filterBys?.[0]).toMatchObject({ lens: "lens:matrix-1:gene=7", min: 0, max: 9 });
  });

  it("returns only the pickers it was handed (each is a whole-array replace)", async () => {
    const result = await resolveEntryInputs(registryOf(), { colorBys: [columnDraft] });
    expect("filterBys" in result).toBe(false);
  });

  it("derives the lens from the POSITION, not from an id the entry was read with", async () => {
    // A picker moves `at` and never the lens id; the mapper drops the id from a
    // positioned entry so a stale one cannot be sent back.
    const stored = {
      __typename: "MeshColorBy" as const,
      kind: ColorSourceKind.Sparse,
      table: null,
      column: null,
      joinPath: [],
      colormap: ColorMap.Magma,
      min: null,
      max: null,
      label: "counts",
      lens: "lens-read-earlier",
      dataset: "matrix-1",
      at: [{ axis: "gene", value: 9 }],
    };
    const draft = colorByEntryToInput(stored);
    expect(draft.lens).toBeNull();
    const { colorBys } = await resolveEntryInputs(registryOf(), { colorBys: [draft] });
    expect(colorBys?.[0].lens).toBe("lens:matrix-1:gene=9");
  });

  it("passes an unresolved sparse entry through by its id", async () => {
    // No position to derive a lens from: the id is the only thing that keeps
    // the entry alive across a whole-array replace.
    const stored = {
      __typename: "MeshColorBy" as const,
      kind: ColorSourceKind.Sparse,
      table: null,
      column: null,
      joinPath: [],
      colormap: null,
      min: null,
      max: null,
      label: null,
      lens: "lens-unknown",
    };
    const registry = registryOf();
    const { colorBys } = await resolveEntryInputs(registry, {
      colorBys: [colorByEntryToInput(stored)],
    });
    expect(registry.ensureSparseLens).not.toHaveBeenCalled();
    expect(colorBys?.[0].lens).toBe("lens-unknown");
  });
});
