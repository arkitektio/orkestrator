// @vitest-environment jsdom
import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/mikro/api/graphql", () => ({
  useGetAnnotationCreatorQuery: () => ({ data: { annotation: { creator: null } } }),
}));
vi.mock("@/core/settings/store/SettingsContext", () => ({
  useSettings: () => ({ settings: { experimentAnnotationHover: true } }),
}));
vi.mock("@/core/linkers", () => ({
  MikroAnnotation: {
    ObjectButton: ({ children, open }: { children: ReactNode; open?: boolean }) => (
      <div data-testid="actions" data-open={String(open)}>
        {children}
      </div>
    ),
  },
}));
vi.mock("@/core/smart/display/StructureDisplay", () => ({ StructureDisplay: () => null }));
vi.mock("./AnnotationInfoCard", () => ({
  AnnotationInfoCard: ({ id }: { id: string }) => <div data-testid="info">{id}</div>,
}));
vi.mock("../../../platform/stores/viewStore", () => ({
  useViewStoreApi: () => ({
    getState: () => ({ viewProjectionMatrix: null, viewportSize: { width: 800, height: 600 }, cameraMoving: false }),
    subscribe: () => () => {},
  }),
}));

import { HoveredAnnotationButton } from "./HoveredAnnotationButton";
import { RoiSelectionStoreContext, createRoiSelectionStore, type VisibleRoi } from "../roiSelectionStore";

const shape = (id: string): VisibleRoi => ({
  id,
  layerId: "layer:annotations",
  name: "soma",
  kind: "RECTANGLE" as never,
  systemId: null,
  axisNames: [],
  vectors: [],
  coordinates: [],
  bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
  zSpan: { min: 0, max: 0 } as never,
});

const mount = () => {
  const store = createRoiSelectionStore();
  act(() => store.getState().setVisibleLayerRois("layer:annotations", [shape("ann:1"), shape("ann:2")]));
  render(
    <RoiSelectionStoreContext.Provider value={store}>
      <HoveredAnnotationButton />
    </RoiSelectionStoreContext.Provider>,
  );
  return store;
};

afterEach(cleanup);

describe("HoveredAnnotationButton", () => {
  it("is a bare button on hover; the card and its query wait for the click", () => {
    const store = mount();
    expect(screen.queryByLabelText("Annotation details")).toBeNull();

    act(() => store.getState().hoverRoi(shape("ann:1"), [0, 0, 0]));

    expect(screen.getByLabelText("Annotation details").getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("info")).toBeNull();
    expect(screen.queryByTestId("actions")).toBeNull();
  });

  it("a click grows it into the shape's card, with the actions behind its header", () => {
    const store = mount();
    act(() => store.getState().hoverRoi(shape("ann:1"), [0, 0, 0]));

    fireEvent.click(screen.getByLabelText("Annotation details"));

    expect(screen.getByLabelText("Annotation details").getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId("info").textContent).toBe("ann:1");
    expect(screen.getByText("Rectangle")).toBeTruthy();
    expect(screen.getByTestId("actions").dataset.open).toBe("false");
  });

  it("an open card holds its shape against the next one the pointer crosses", () => {
    const store = mount();
    act(() => store.getState().hoverRoi(shape("ann:1"), [0, 0, 0]));
    fireEvent.click(screen.getByLabelText("Annotation details"));

    act(() => store.getState().hoverRoi(shape("ann:2"), [5, 5, 0]));

    expect(store.getState().hoveredRoi?.id).toBe("ann:1");
    expect(screen.getByTestId("info").textContent).toBe("ann:1");
  });

  it("closes on Escape, on a press outside and on its close button — not on a press inside", () => {
    const store = mount();
    act(() => store.getState().hoverRoi(shape("ann:1"), [0, 0, 0]));
    const toggle = () => fireEvent.click(screen.getByLabelText("Annotation details"));

    toggle();
    fireEvent.pointerDown(screen.getByTestId("info"));
    expect(screen.getByTestId("info")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("info")).toBeNull();

    toggle();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByTestId("info")).toBeNull();

    toggle();
    fireEvent.click(screen.getByLabelText("Close"));
    expect(screen.queryByTestId("info")).toBeNull();
  });
});
