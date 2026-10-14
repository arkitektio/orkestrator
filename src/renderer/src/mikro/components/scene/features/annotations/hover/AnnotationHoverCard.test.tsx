// @vitest-environment jsdom
import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const author: { creator: { sub: string } | null } = { creator: null };
vi.mock("@/mikro/api/graphql", () => ({
  useGetAnnotationCreatorQuery: () => ({ data: { annotation: author } }),
}));
const settings = { experimentAnnotationHover: true };
vi.mock("@/core/settings/store/SettingsContext", () => ({
  useSettings: () => ({ settings }),
}));
vi.mock("@/core/linkers", () => ({
  MikroAnnotation: {
    ObjectButton: ({ children, open }: { children: ReactNode; open?: boolean }) => (
      <div data-testid="full-menu" data-open={String(open)}>
        {children}
      </div>
    ),
  },
}));
vi.mock("@/core/smart/display/StructureDisplay", () => ({
  StructureDisplay: ({ id, variant }: { id: string; variant: string }) => <span>{`${variant}:${id}`}</span>,
}));
vi.mock("./AnnotationInfoCard", () => ({
  AnnotationInfoCard: ({ id }: { id: string }) => <div data-testid="info">{id}</div>,
}));
vi.mock("./AnnotationPairActions", () => ({
  AnnotationPairActions: ({ roi, autoFocus }: { roi: { id: string }; autoFocus: boolean }) => (
    <div data-testid="pair" data-autofocus={String(autoFocus)}>
      {roi.id}
    </div>
  ),
}));
vi.mock("../../../platform/stores/viewStore", () => ({
  useViewStoreApi: () => ({
    getState: () => ({ viewProjectionMatrix: null, viewportSize: { width: 800, height: 600 }, cameraMoving: false }),
    subscribe: () => () => {},
  }),
}));

import { AnnotationHoverCard, PEEK_DELAY_MS, PEEK_GRACE_MS } from "./AnnotationHoverCard";
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

const mount = ({ shown = true } = {}) => {
  const store = createRoiSelectionStore();
  if (shown) {
    act(() => store.getState().setVisibleLayerRois("layer:annotations", [shape("ann:1"), shape("ann:2")]));
  }
  render(
    <RoiSelectionStoreContext.Provider value={store}>
      <AnnotationHoverCard />
    </RoiSelectionStoreContext.Provider>,
  );
  return store;
};

const avatar = () => screen.getByLabelText("Annotation details");
const isOpen = () => avatar().getAttribute("aria-expanded") === "true";

beforeEach(() => {
  vi.useFakeTimers();
  settings.experimentAnnotationHover = true;
  author.creator = null;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("AnnotationHoverCard", () => {
  it("is a bare button on hover; its card and queries wait for the pointer to rest on it", () => {
    const store = mount();
    expect(screen.queryByLabelText("Annotation details")).toBeNull();

    act(() => store.getState().hoverRoi(shape("ann:1"), [0, 0, 0]));

    expect(isOpen()).toBe(false);
    expect(screen.queryByTestId("info")).toBeNull();
    expect(screen.queryByTestId("pair")).toBeNull();
  });

  it("resting on the avatar unfolds the card with the actions, without taking the keyboard; leaving folds it", () => {
    const store = mount();
    act(() => store.getState().hoverRoi(shape("ann:1"), [0, 0, 0]));

    fireEvent.pointerEnter(avatar());
    act(() => vi.advanceTimersByTime(PEEK_DELAY_MS));

    expect(isOpen()).toBe(true);
    expect(screen.getByTestId("info").textContent).toBe("ann:1");
    expect(screen.getByTestId("pair").dataset.autofocus).toBe("false");
    expect(screen.getByText("Rectangle")).toBeTruthy();
    expect(store.getState().menuRoi).toBeNull();

    fireEvent.pointerLeave(avatar().closest("[data-nonbreaker]")!);
    act(() => vi.advanceTimersByTime(PEEK_GRACE_MS));
    expect(isOpen()).toBe(false);
  });

  it("wears the author's avatar, and the open card's header names them", () => {
    author.creator = { sub: "user:7" };
    const store = mount();
    act(() => store.getState().hoverRoi(shape("ann:1"), [0, 0, 0]));

    expect(screen.getByText("avatar:user:7")).toBeTruthy();
    expect(screen.queryByText("inline:user:7")).toBeNull();

    fireEvent.click(avatar());
    expect(screen.getByText("Rectangle")).toBeTruthy();
    expect(screen.getByText("inline:user:7").parentElement!.textContent).toBe(" by inline:user:7");
  });

  it("a pointer only crossing the avatar opens nothing", () => {
    const store = mount();
    act(() => store.getState().hoverRoi(shape("ann:1"), [0, 0, 0]));

    fireEvent.pointerEnter(avatar());
    fireEvent.pointerLeave(avatar().closest("[data-nonbreaker]")!);
    // Back on the shape: the hover stays, and the open the avatar armed was dropped.
    act(() => store.getState().hoverRoi(shape("ann:1"), [0, 0, 0]));
    act(() => vi.advanceTimersByTime(PEEK_DELAY_MS));

    expect(isOpen()).toBe(false);
  });

  it("a click on the avatar pins the card: leaving no longer folds it, a second click does", () => {
    const store = mount();
    act(() => store.getState().hoverRoi(shape("ann:1"), [0, 0, 0]));

    fireEvent.click(avatar());
    expect(isOpen()).toBe(true);
    expect(store.getState().menuRoi?.roi.id).toBe("ann:1");

    fireEvent.pointerLeave(avatar().closest("[data-nonbreaker]")!);
    act(() => vi.advanceTimersByTime(PEEK_GRACE_MS));
    expect(isOpen()).toBe(true);

    fireEvent.click(avatar());
    expect(isOpen()).toBe(false);
    expect(store.getState().menuRoi).toBeNull();
  });

  it("an open card holds its shape against the next one the pointer crosses", () => {
    const store = mount();
    act(() => store.getState().hoverRoi(shape("ann:1"), [0, 0, 0]));
    fireEvent.click(avatar());

    act(() => store.getState().hoverRoi(shape("ann:2"), [5, 5, 0]));

    expect(store.getState().hoveredRoi?.id).toBe("ann:1");
    expect(screen.getByTestId("info").textContent).toBe("ann:1");
  });

  it("a click on a shape opens its card pinned and typing goes to its search — with the experiment off too", () => {
    settings.experimentAnnotationHover = false;
    const store = mount();
    act(() => store.getState().hoverRoi(shape("ann:1"), [0, 0, 0]));
    expect(screen.queryByLabelText("Annotation details")).toBeNull();

    act(() => store.getState().openRoiMenu(shape("ann:1"), [1, 2, 3]));

    expect(isOpen()).toBe(true);
    expect(screen.getByTestId("pair").dataset.autofocus).toBe("true");

    fireEvent.click(screen.getByLabelText("Close"));
    expect(store.getState().menuRoi).toBeNull();
    expect(screen.queryByLabelText("Annotation details")).toBeNull();
  });

  it("a shape just drawn (no click point) opens once its layer shows it, leaving the held draw key to the scene", () => {
    const store = mount({ shown: false });

    act(() => store.getState().openRoiMenu(shape("ann:1")));
    expect(screen.queryByLabelText("Annotation details")).toBeNull();

    act(() => store.getState().setVisibleLayerRois("layer:annotations", [shape("ann:1")]));
    expect(isOpen()).toBe(true);
    expect(screen.getByTestId("pair").dataset.autofocus).toBe("false");
  });

  it("closes on Escape and on a press outside — not on a press inside", () => {
    const store = mount();
    act(() => store.getState().hoverRoi(shape("ann:1"), [0, 0, 0]));

    fireEvent.click(avatar());
    fireEvent.pointerDown(screen.getByTestId("info"));
    expect(isOpen()).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(isOpen()).toBe(false);

    fireEvent.click(avatar());
    fireEvent.pointerDown(document.body);
    expect(isOpen()).toBe(false);
    expect(store.getState().menuRoi).toBeNull();
  });

  it("a click on the scene closes it, unless that click opened a shape's card", () => {
    const store = mount();
    const canvas = document.body.appendChild(document.createElement("canvas"));
    act(() => store.getState().hoverRoi(shape("ann:1"), [0, 0, 0]));
    fireEvent.click(avatar());

    // On the shape: the scene re-opens the card in the same click.
    fireEvent.pointerDown(canvas);
    expect(isOpen()).toBe(true);
    canvas.addEventListener("click", () => store.getState().openRoiMenu(shape("ann:1"), [4, 4, 0]), { once: true });
    fireEvent.click(canvas);
    expect(isOpen()).toBe(true);

    // A drag that orbited the camera.
    fireEvent.pointerDown(canvas, { clientX: 0, clientY: 0 });
    fireEvent.click(canvas, { clientX: 40, clientY: 40 });
    expect(isOpen()).toBe(true);

    // On nothing.
    fireEvent.pointerDown(canvas);
    fireEvent.click(canvas);
    expect(isOpen()).toBe(false);
    canvas.remove();
  });

  it("a right-press on the scene closes it at once: it never clicks", () => {
    const store = mount();
    const canvas = document.body.appendChild(document.createElement("canvas"));
    act(() => store.getState().hoverRoi(shape("ann:1"), [0, 0, 0]));
    fireEvent.click(avatar());

    fireEvent.pointerDown(canvas, { button: 2 });

    expect(isOpen()).toBe(false);
    canvas.remove();
  });
});
