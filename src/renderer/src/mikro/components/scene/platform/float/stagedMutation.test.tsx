// @vitest-environment jsdom
import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { parse } from "graphql";
import { describe, expect, it, vi } from "vitest";

import { StagedLayersStoreContext, createStagedLayersStore, type StagedLayer } from "./stagedLayerStore";
import { useStagedLayerMutation } from "./stagedMutation";

const UPDATE = parse("mutation U($input: UpdateLayerInput!) { updateLayer(input: $input) { id } }");

const setup = () => {
  const store = createStagedLayersStore();
  store.getState().stage({ key: "staged:a", owner: "o", label: "a", input: {}, layer: { id: "staged:a" }, engine: { id: "staged:a" } } as unknown as StagedLayer);
  const mutate = vi.fn(async () => ({ data: { updateLayer: { id: "7" } } }));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <StagedLayersStoreContext.Provider value={store}>{children}</StagedLayersStoreContext.Provider>
  );
  const { result } = renderHook(() => useStagedLayerMutation([mutate, { loading: false }] as const, UPDATE), { wrapper });
  return { store, mutate, update: result.current[0] as (options: { variables: unknown }) => Promise<{ data?: unknown }> };
};

describe("useStagedLayerMutation", () => {
  it("holds a write to a staged layer on its entry, and answers with no data", async () => {
    const { store, mutate, update } = setup();
    const answer = await update({ variables: { input: { id: "staged:a", opacity: 0.5 } } });
    expect(mutate).not.toHaveBeenCalled();
    expect(answer.data).toBeUndefined();
    expect(store.getState().entries[0].edits).toEqual([{ document: UPDATE, variables: { input: { id: "staged:a", opacity: 0.5 } } }]);
  });

  it("sends a write to a saved layer", async () => {
    const { store, mutate, update } = setup();
    await update({ variables: { input: { id: "7", opacity: 0.5 } } });
    expect(mutate).toHaveBeenCalledWith({ variables: { input: { id: "7", opacity: 0.5 } } });
    expect(store.getState().entries[0].edits).toBeUndefined();
  });
});
