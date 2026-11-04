// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const client = { refetchQueries: vi.fn(async () => []) };
const stage = vi.fn(async () => ({ status: "staged", key: "staged:x" }));
vi.mock("@/mikro/api/funcs", () => ({ useMikro: () => client }));
vi.mock("./useStaging", () => ({ useStaging: () => ({ stage }) }));
vi.mock("@/mikro/lenses", () => ({
  LENS_KINDS: { ArrayLens: { identifier: "@mikro/arraylens" }, MeshLens: { identifier: "@mikro/meshlens" } },
}));

import { useResultSink, type ResultSink } from "@/core/smart/extensions/results";
import { StagedLayersStoreContext, createStagedLayersStore } from "../../platform/float/stagedLayerStore";
import { StagingResultSink } from "./StagingResultSink";

let sink: ResultSink | null = null;
const Grab = () => {
  sink = useResultSink();
  return null;
};

const mount = (owner = "annotation:1") =>
  render(
    <StagedLayersStoreContext.Provider value={createStagedLayersStore()}>
      <StagingResultSink owner={owner}>
        <Grab />
      </StagingResultSink>
    </StagedLayersStoreContext.Provider>,
  );

/** Let the sink's queue run. */
const settle = () => act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("StagingResultSink", () => {
  it("refetches the float's own question after a run that returned nothing", async () => {
    mount("annotation:1");
    sink!([]);
    await settle();
    expect(stage).not.toHaveBeenCalled();
    expect(client.refetchQueries).toHaveBeenCalledWith({ include: ["GetAnnotationInfo"] });
  });

  it("stages a returned lens under the float, then refetches", async () => {
    mount("mesh:m:3");
    sink!([{ identifier: "@mikro/arraylens", id: "7", label: "crop" }]);
    await settle();
    expect(stage).toHaveBeenCalledWith("mesh:m:3", { kind: "array", lens: "7", label: "crop" }, undefined);
    expect(client.refetchQueries).toHaveBeenCalledWith({ include: ["GetMeshObjectInfo"] });
  });

  it("stages nothing for a run that ends after its float closed", async () => {
    const { unmount } = mount();
    const late = sink!;
    unmount();
    late([{ identifier: "@mikro/arraylens", id: "7" }]);
    await settle();
    expect(stage).not.toHaveBeenCalled();
    expect(client.refetchQueries).not.toHaveBeenCalled();
  });
});
