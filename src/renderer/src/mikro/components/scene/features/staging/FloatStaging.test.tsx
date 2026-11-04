// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./useStaging", () => ({ useStaging: () => ({ stage: vi.fn(), keep: vi.fn(), discard: vi.fn() }) }));

import {
  StagedLayersStoreContext,
  createStagedLayersStore,
  type StagedLayer,
} from "../../platform/float/stagedLayerStore";
import { useFloatStaging } from "./FloatStaging";

const entry = (key: string, owner: string, extra: Partial<StagedLayer> = {}): StagedLayer =>
  ({ key, owner, label: key, input: {}, layer: { id: key }, engine: { id: key }, ...extra }) as unknown as StagedLayer;

const Float = ({ owner }: { owner: string }) => {
  useFloatStaging(owner);
  return null;
};

afterEach(cleanup);

describe("useFloatStaging", () => {
  it("discards what the float staged and nobody kept when it closes", () => {
    const store = createStagedLayersStore();
    store.getState().stage(entry("staged:a", "annotation:1"));
    store.getState().stage(entry("staged:b", "annotation:1", { keeping: true }));
    store.getState().stage(entry("staged:c", "mesh:m:3"));
    const { unmount } = render(
      <StagedLayersStoreContext.Provider value={store}>
        <Float owner="annotation:1" />
      </StagedLayersStoreContext.Provider>,
    );
    expect(store.getState().entries).toHaveLength(3);

    unmount();
    // A Keep in flight finishes on its own; another float's layers are its own.
    expect(store.getState().entries.map((e) => e.key)).toEqual(["staged:b", "staged:c"]);
  });
});
