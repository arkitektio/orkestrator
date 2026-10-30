// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import type { SceneAnnotationFragment } from "@/mikro/api/graphql";

const mocks = vi.hoisted(() => ({
  measure: vi.fn((..._args: unknown[]) => null),
  toggle: vi.fn(),
  objectButtons: { mounted: 0 },
}));

vi.mock("@/core/linkers", () => ({
  MikroAnnotation: {
    ObjectButton: () => {
      mocks.objectButtons.mounted += 1;
      return <button>actions</button>;
    },
    Smart: ({ children }: { children: unknown }) => children,
  },
}));
vi.mock("./roiMeasure", () => ({
  measureAnnotation: mocks.measure,
  formatAnnotationMeasure: () => null,
}));
vi.mock("./annotationBounds", () => ({ resolveCollectionMatrix: () => new THREE.Matrix4() }));
vi.mock("./useNavigateToAnnotation", () => ({ useNavigateToAnnotation: () => vi.fn() }));
vi.mock("./useDeleteSelectedRois", () => ({
  useDeleteRoi: () => ({ deleteRoi: stableDelete, deletingIds: stableDeleting }),
  useDeleteSelectedRois: () => ({ deleteSelectedRois: vi.fn(), isDeleting: false }),
}));
vi.mock("./roiSelectionStore", () => ({
  useRoiSelectionStore: (selector: (s: { toggleSelectedRoi: unknown }) => unknown) =>
    selector({ toggleSelectedRoi: mocks.toggle }),
}));
vi.mock("./RoiAttributeSection", () => ({ RoiAttributeSection: () => null }));
vi.mock("../../platform/stores/sceneStore", () => ({
  useSceneStore: (selector: (s: { transformContext: null; spatialUnit: string }) => unknown) =>
    selector({ transformContext: null, spatialUnit: "um" }),
}));
vi.mock("../../platform/coords/sceneUnits", () => ({ unitLabel: () => "µm" }));
vi.mock("../../platform/model/selectionFormat", () => ({
  formatAnnotationKind: (kind: string) => kind,
  indexLabel: (index: number) => `#${index}`,
}));

const stableDelete = vi.fn();
const stableDeleting = new Set<string>();

import { AnnotationList } from "./AnnotationList";

const annotations = ["a", "b", "c"].map(
  (id) => ({ id, kind: "RECTANGLE", vectors: [[0, 0, 0]] }) as unknown as SceneAnnotationFragment,
);
const layer = {
  id: "layer",
  annotationCollection: { coordinateSystem: { id: "sys", axes: [] } },
} as never;

beforeEach(() => {
  mocks.measure.mockClear();
  mocks.toggle.mockClear();
  mocks.objectButtons.mounted = 0;
});

describe("AnnotationList", () => {
  it("re-measures nothing when the selection changes", () => {
    const { rerender } = render(
      <AnnotationList layer={layer} annotations={annotations} selectedIds={new Set()} />,
    );
    expect(mocks.measure).toHaveBeenCalledTimes(3);
    mocks.measure.mockClear();

    rerender(<AnnotationList layer={layer} annotations={annotations} selectedIds={new Set(["b"])} />);
    expect(mocks.measure).not.toHaveBeenCalled();
    expect(screen.getByText("#1").parentElement?.title).toBe("Click to deselect");
  });

  it("re-measures only a shape that changed", () => {
    const { rerender } = render(
      <AnnotationList layer={layer} annotations={annotations} selectedIds={new Set()} />,
    );
    mocks.measure.mockClear();
    const edited = [annotations[0], { ...annotations[1] }, annotations[2]];
    rerender(<AnnotationList layer={layer} annotations={edited} selectedIds={new Set()} />);
    expect(mocks.measure).toHaveBeenCalledTimes(1);
  });

  it("mounts a row's action button on first hover, and keeps it", () => {
    render(<AnnotationList layer={layer} annotations={annotations} selectedIds={new Set()} />);
    expect(mocks.objectButtons.mounted).toBe(0);
    const row = screen.getByText("#0").parentElement!;
    act(() => {
      fireEvent.mouseEnter(row);
    });
    expect(screen.getAllByText("actions")).toHaveLength(1);
    act(() => {
      fireEvent.mouseLeave(row);
    });
    expect(screen.getAllByText("actions")).toHaveLength(1);
  });

  it("still toggles and deletes through the row", () => {
    render(<AnnotationList layer={layer} annotations={annotations} selectedIds={new Set()} />);
    fireEvent.click(screen.getByText("#2"));
    expect(mocks.toggle).toHaveBeenCalledWith(expect.objectContaining({ id: "c", layerId: "layer" }));
    fireEvent.click(screen.getAllByTitle("Delete annotation")[0]);
    expect(stableDelete).toHaveBeenCalledWith("a");
    expect(mocks.toggle).toHaveBeenCalledTimes(1);
  });
});
