// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const info = { annotation: { id: "ann:1", descriptors: { "@mikro/annotation_kind": "PATH" }, description: null, derivedFrom: [] } };
vi.mock("./AnnotationInfoCard", () => ({
  useAnnotationInfo: () => ({ data: info, error: undefined, refetch: () => {} }),
  InfoPending: () => <div>pending</div>,
  AnnotationDerived: () => null,
  AnnotationDetails: () => null,
  derivedCount: () => 0,
  hasDetails: () => false,
}));
vi.mock("../useRoiMeasure", () => ({ useRoiMeasure: () => null }));
vi.mock("../../staging/FloatStaging", () => ({ StagedPane: () => null }));
// The panes stand for themselves: what each row opens, and with what.
vi.mock("./AnnotationPairActions", () => ({
  AnnotationPairActions: ({ layerId }: { layerId: string }) => <div data-testid="pair">{layerId}</div>,
}));
let everything: unknown = { selection: { kind: "everything" }, label: "This slice of Cells.czi" };
vi.mock("./AnnotationRunActions", () => ({
  useVisibleEverything: () => everything,
  AnnotationShapeActions: ({ kindWord }: { kindWord: string }) => <div data-testid="shape">{kindWord}</div>,
  AnnotationEverythingActions: ({ everything: e }: { everything: { label: string } }) => (
    <div data-testid="everything">{e.label}</div>
  ),
}));
const layers = [
  { id: "layer:dapi", name: "DAPI" },
  { id: "layer:gfp", name: "GFP", visible: false },
];
vi.mock("../../../platform/stores/sceneStore", () => ({
  useSceneStoreApi: () => ({ getState: () => ({ layers }) }),
}));
vi.mock("../../../platform/stores/viewerStore", () => ({
  useViewerStore: (selector: (s: unknown) => unknown) => selector({ dataLayerId: null }),
}));
vi.mock("../../../platform/layerui/layerIdentity", () => ({
  layerDisplayLabel: (layer: { name: string }) => layer.name,
}));

import { AnnotationFloatMenu } from "./AnnotationFloatMenu";
import type { SelectedRoi } from "../roiSelectionStore";

const roi: SelectedRoi = {
  id: "ann:1",
  layerId: "layer:annotations",
  name: "axon",
  kind: "PATH" as never,
  systemId: null,
  axisNames: [],
  vectors: [],
  coordinates: [],
};

/** Controlled like the card controls it. */
const Menu = () => {
  const [pane, setPane] = useState<string | null>(null);
  return (
    <AnnotationFloatMenu
      roi={roi}
      staging={{ entries: [], holding: false }}
      pane={pane}
      onPaneChange={setPane}
      autoFocus={false}
    />
  );
};

const rows = () =>
  Array.from(document.querySelectorAll("button[data-float-row]")).map(
    (row) => row.querySelector("span")?.textContent,
  );

afterEach(() => {
  cleanup();
  everything = { selection: { kind: "everything" }, label: "This slice of Cells.czi" };
});

describe("AnnotationFloatMenu", () => {
  it("offers three ways to run: the shape alone, with a layer, with everything visible", () => {
    render(<Menu />);
    expect(rows()).toEqual(["Run on path", "Run on layer", "Run on everything", "Derived"]);
  });

  it("the shape alone needs no image", () => {
    render(<Menu />);
    fireEvent.click(screen.getByText("Run on path"));
    expect(screen.getByTestId("shape").textContent).toBe("path");
  });

  it("'Run on layer' lists every layer, hidden ones too, each pairing the shape with it", () => {
    render(<Menu />);
    fireEvent.click(screen.getByText("Run on layer"));
    // The root is still sliding out in jsdom: the layer rows are the last ones.
    expect(rows().slice(-2)).toEqual(["DAPI", "GFP"]);
    fireEvent.click(screen.getByText("GFP"));
    expect(screen.getByTestId("pair").textContent).toBe("layer:gfp");
  });

  it("'Run on everything' runs with what is visible; without anything visible it is not offered", () => {
    render(<Menu />);
    fireEvent.click(screen.getByText("Run on everything"));
    expect(screen.getByTestId("everything").textContent).toBe("This slice of Cells.czi");
    cleanup();

    everything = null;
    render(<Menu />);
    expect(rows()).toEqual(["Run on path", "Run on layer", "Derived"]);
  });
});
