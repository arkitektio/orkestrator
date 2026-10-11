// @vitest-environment jsdom
// (the registry imports the generated documents, whose Apollo hooks barrel
// touches `window` on load)
import { describe, expect, it, vi } from "vitest";
import type { MikroClient } from "@/core/data/zarr/store/types";
import { lensRegistry } from "./lensRegistry";

const arrayLens = (id: string, dataset: string, slices: object[] = []) => ({
  __typename: "ArrayLens" as const,
  id,
  slices,
  dataset: { id: dataset },
});

const sparseLens = (id: string, dataset: string, windows: object[]) => ({
  __typename: "SparseLens" as const,
  id,
  windows,
  sparseDataset: { id: dataset },
});

/** A client that answers every create with a lens for what was asked. */
const clientOf = (overrides: Partial<MikroClient> = {}) => {
  let minted = 0;
  const client = {
    mutate: vi.fn(async ({ variables }: { variables: { input: Record<string, unknown> } }) => {
      minted += 1;
      const { input } = variables;
      if (input.sparseDataset) {
        return {
          data: {
            createSparseLens: sparseLens(
              `sparse-${minted}`,
              input.sparseDataset as string,
              input.windows as object[],
            ),
          },
        };
      }
      if (input.tableDataset) {
        return {
          data: {
            createTableLens: {
              __typename: "TableLens",
              id: `table-${minted}`,
              tableDataset: { id: input.tableDataset },
            },
          },
        };
      }
      return {
        data: {
          createLens: arrayLens(
            `array-${minted}`,
            input.dataset as string,
            input.slices as object[],
          ),
        },
      };
    }),
    query: vi.fn(async ({ variables }: { variables: { ids: string[] } }) => ({
      data: {
        lenses: variables.ids.map((id) =>
          arrayLens(id, "dataset-1", [{ axis: "c", start: 3, stop: 4, step: 1 }]),
        ),
      },
    })),
    ...overrides,
  };
  return client as unknown as MikroClient & {
    mutate: ReturnType<typeof vi.fn>;
    query: ReturnType<typeof vi.fn>;
  };
};

describe("lensRegistry — id to selection", () => {
  it("resolves every unknown id in ONE request", async () => {
    const client = clientOf();
    const registry = lensRegistry(client);
    await registry.resolveMany(["a", "b", "a", null]);
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query.mock.calls[0][0].variables).toEqual({ ids: ["a", "b"], limit: 2 });
    expect(registry.peek("a")).toMatchObject({ kind: "array", dataset: "dataset-1" });
    expect(registry.missing(["a", "b", "c"])).toEqual(["c"]);
  });

  it("sends nothing for ids it already knows", async () => {
    const client = clientOf();
    const registry = lensRegistry(client);
    registry.seed(arrayLens("known", "dataset-1"));
    await registry.resolveMany(["known"]);
    expect(client.query).not.toHaveBeenCalled();
  });

  it("shares one request between two callers asking at once", async () => {
    const client = clientOf();
    const registry = lensRegistry(client);
    await Promise.all([registry.resolveMany(["a"]), registry.resolveMany(["a"])]);
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it("never rejects: a failed lookup leaves the ids unknown", async () => {
    const client = clientOf({
      query: vi.fn(async () => {
        throw new Error("offline");
      }) as never,
    });
    const registry = lensRegistry(client);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(registry.resolveMany(["a"])).resolves.toBeUndefined();
    expect(registry.peek("a")).toBeUndefined();
    warn.mockRestore();
  });
});

describe("lensRegistry — selection to id", () => {
  it("finds a channel lens the payload already showed, without a request", async () => {
    const client = clientOf();
    const registry = lensRegistry(client);
    registry.seed(arrayLens("lens-c2", "dataset-1", [{ axis: "c", start: 2, stop: 3, step: 1 }]));
    await expect(registry.ensureChannelLens("dataset-1", [], "c", 2)).resolves.toBe("lens-c2");
    expect(client.mutate).not.toHaveBeenCalled();
  });

  it("makes a channel nobody has seen, once, and then knows it both ways", async () => {
    const client = clientOf();
    const registry = lensRegistry(client);
    const [first, second] = await Promise.all([
      registry.ensureChannelLens("dataset-1", [], "c", 1),
      registry.ensureChannelLens("dataset-1", [], "c", 1),
    ]);
    expect(first).toBe(second);
    expect(client.mutate).toHaveBeenCalledTimes(1);
    expect(client.mutate.mock.calls[0][0].variables.input).toEqual({
      dataset: "dataset-1",
      slices: [{ axis: "c", start: 1, stop: 2, step: 1 }],
    });
    expect(registry.peek(first)).toMatchObject({ kind: "array", dataset: "dataset-1" });
    await registry.ensureChannelLens("dataset-1", [], "c", 1);
    expect(client.mutate).toHaveBeenCalledTimes(1);
  });

  it("pins a sparse position as windows and reads the lens back as that position", async () => {
    const client = clientOf();
    const registry = lensRegistry(client);
    const id = await registry.ensureSparseLens("matrix-1", [{ axis: "gene", value: 4711 }]);
    expect(client.mutate.mock.calls[0][0].variables.input).toEqual({
      sparseDataset: "matrix-1",
      windows: [{ axis: "gene", min: 4711, max: 4711 }],
    });
    expect(registry.peek(id)).toEqual({
      kind: "sparse",
      id,
      dataset: "matrix-1",
      at: [{ axis: "gene", value: 4711 }],
    });
  });

  it("asks for a container's whole lens with no windows", async () => {
    const client = clientOf();
    const registry = lensRegistry(client);
    await registry.ensureWholeLens({ tableDataset: "table-9" });
    expect(client.mutate.mock.calls[0][0].variables.input).toEqual({ tableDataset: "table-9" });
    await registry.ensureWholeLens({ tableDataset: "table-9" });
    expect(client.mutate).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failure", async () => {
    const mutate = vi
      .fn()
      .mockRejectedValueOnce(new Error("refused"))
      .mockResolvedValueOnce({ data: { createLens: arrayLens("lens-ok", "dataset-1") } });
    const registry = lensRegistry(clientOf({ mutate: mutate as never }));
    await expect(registry.ensureArrayLens("dataset-1", [])).rejects.toThrow("refused");
    await expect(registry.ensureArrayLens("dataset-1", [])).resolves.toBe("lens-ok");
  });

  it("forgets a lens that is gone, so the next ask makes it again", async () => {
    const client = clientOf();
    const registry = lensRegistry(client);
    const id = await registry.ensureChannelLens("dataset-1", [], "c", 0);
    registry.forget(id);
    await Promise.resolve();
    expect(registry.peek(id)).toBeUndefined();
    await registry.ensureChannelLens("dataset-1", [], "c", 0);
    expect(client.mutate).toHaveBeenCalledTimes(2);
  });

  it("keeps one registry per client", async () => {
    const a = clientOf();
    const b = clientOf();
    lensRegistry(a).seed(arrayLens("only-a", "dataset-1"));
    expect(lensRegistry(a).peek("only-a")).toBeDefined();
    expect(lensRegistry(b).peek("only-a")).toBeUndefined();
    expect(lensRegistry(a)).toBe(lensRegistry(a));
  });
});
