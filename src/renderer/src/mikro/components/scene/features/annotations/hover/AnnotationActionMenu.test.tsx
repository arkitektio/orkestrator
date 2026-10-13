// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const descriptorsQuery = vi.fn();
vi.mock("@/mikro/api/graphql", () => ({
  useGetAnnotationDescriptorsQuery: (options: unknown) => descriptorsQuery(options),
}));
vi.mock("@/core/smart/ObjectButton", () => ({
  SmartContext: (props: { objects: unknown; partners: unknown; autoFocus?: boolean }) => (
    <div data-testid="menu" data-autofocus={String(props.autoFocus)}>{JSON.stringify({ objects: props.objects, partners: props.partners })}</div>
  ),
}));
vi.mock("@/core/layout/fallbacks/StatusPage", () => ({ StatusPage: () => <div>error</div> }));
vi.mock("@/core/layout/fallbacks/statusActions", () => ({ RetryButton: () => null }));
const layers = [{ id: "layer:image", name: "DAPI", lens: { id: "7", descriptors: { "@mikro/n_space_axes": 2 } } }];
vi.mock("../../../platform/stores/sceneStore", () => ({
  useSceneStore: (selector: (s: unknown) => unknown) => selector({ layers }),
  useSceneStoreApi: () => ({ getState: () => ({ layers }) }),
}));
vi.mock("../../../platform/stores/viewerStore", () => ({
  useViewerStore: (selector: (s: unknown) => unknown) => selector({ probeLayerId: null }),
}));
vi.mock("../../../platform/stores/viewStore", () => ({
  useViewStoreApi: () => ({
    getState: () => ({ viewProjectionMatrix: null, viewportSize: { width: 100, height: 100 } }),
    subscribe: () => () => {},
  }),
}));
vi.mock("../../../platform/layerui/layerIdentity", () => ({ layerDisplayLabel: () => "DAPI" }));

import { AnnotationActionMenu } from "./AnnotationActionMenu";
import { RoiSelectionStoreContext, createRoiSelectionStore, type SelectedRoi } from "../roiSelectionStore";

const roi: SelectedRoi = {
  id: "ann:1",
  layerId: "layer:annotations",
  name: "soma",
  kind: "RECTANGLE" as never,
  systemId: null,
  axisNames: [],
  vectors: [],
  coordinates: [],
};

const mount = () => {
  const store = createRoiSelectionStore();
  render(
    <RoiSelectionStoreContext.Provider value={store}>
      <AnnotationActionMenu />
    </RoiSelectionStoreContext.Provider>,
  );
  return store;
};

afterEach(cleanup);

describe("AnnotationActionMenu", () => {
  it("a click opens the pair menu: the shape with its descriptors, against the probed lens", () => {
    descriptorsQuery.mockReturnValue({ data: { annotation: { descriptors: { "@mikro/annotation_kind": "RECTANGLE" } } } });
    const store = mount();
    expect(screen.queryByTestId("menu")).toBeNull();

    act(() => store.getState().openRoiMenu(roi, [1, 2, 3]));

    // No key is held for a click: the search field takes focus.
    expect(screen.getByTestId("menu").dataset.autofocus).toBe("true");
    expect(JSON.parse(screen.getByTestId("menu").textContent ?? "")).toEqual({
      objects: [
        { identifier: "@mikro/annotation", id: "ann:1", label: "soma", descriptors: { "@mikro/annotation_kind": "RECTANGLE" } },
      ],
      partners: [
        { identifier: "@mikro/arraylens", id: "7", label: "DAPI", descriptors: { "@mikro/n_space_axes": 2 } },
      ],
    });
  });

  it("a shape just drawn (no click point) opens once its layer shows it", () => {
    descriptorsQuery.mockReturnValue({ data: { annotation: { descriptors: {} } } });
    const store = mount();

    act(() => store.getState().openRoiMenu(roi));
    expect(screen.queryByTestId("menu")).toBeNull();

    act(() =>
      store.getState().setVisibleLayerRois("layer:annotations", [
        { ...roi, bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 }, zSpan: { min: 0, max: 0 } as never },
      ]),
    );
    // The draw key is still held: its auto-repeat must not land in the search.
    expect(screen.getByTestId("menu").dataset.autofocus).toBe("false");
  });
});
