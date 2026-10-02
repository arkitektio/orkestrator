// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { MIKRO_OPTION_SOURCES } from "./options";

const source = (identifier: string) => MIKRO_OPTION_SOURCES.find((s) => s.identifier === identifier)!;

const client = (data: unknown) => ({ query: vi.fn(async () => ({ data })) }) as never;
const variablesOf = (fake: unknown) =>
  (fake as { query: ReturnType<typeof vi.fn> }).query.mock.calls.at(-1)?.[0].variables;

describe("mikro's option sources", () => {
  it("offers datasets by name, falling back to the id for an unnamed one", async () => {
    const datasets = client({ arrayDatasets: [{ id: "1", name: "Blobs" }, { id: "2", name: "" }] });
    expect(await source("@mikro/arraydataset").search(datasets, {})).toEqual([
      { value: "1", label: "Blobs" },
      { value: "2", label: "Unnamed dataset (2)" },
    ]);
    expect(variablesOf(datasets).filters).toBeUndefined();
  });

  it("searches by text, but resolves held values by id", async () => {
    const datasets = client({ arrayDatasets: [] });
    await source("@mikro/arraydataset").search(datasets, { search: "psf" });
    expect(variablesOf(datasets).filters).toEqual({ search: "psf" });

    await source("@mikro/arraydataset").search(datasets, { search: "psf", values: ["7"] });
    expect(variablesOf(datasets).filters).toEqual({ ids: ["7"] });
  });

  it("never answers from the cache: a picker is opened to find what was just made", async () => {
    const scenes = client({ scenes: [{ id: "3", name: "Default" }] });
    expect(await source("@mikro/scene").search(scenes, {})).toEqual([{ value: "3", label: "Default" }]);
    expect((scenes as { query: ReturnType<typeof vi.fn> }).query).toHaveBeenCalledWith(
      expect.objectContaining({ fetchPolicy: "no-cache" }),
    );
  });
});
