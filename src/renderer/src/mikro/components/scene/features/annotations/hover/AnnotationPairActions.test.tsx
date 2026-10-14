// @vitest-environment jsdom
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const descriptorsQuery = vi.fn();
vi.mock("@/mikro/api/graphql", () => ({
  useGetAnnotationDescriptorsQuery: (options: unknown) => descriptorsQuery(options),
}));
const menuProps = vi.fn();
vi.mock("@/core/smart/ObjectButton", () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return {
    TILE_SKIN: { name: "tiles" },
    useSmartMenu: (props: unknown) => {
      menuProps(props);
      return { setFilter: () => {} };
    },
    SmartMenu: {
      Root: ({ children, skin }: { children: ReactNode; skin: { name: string } }) => (
        <div data-testid="menu" data-skin={skin.name}>
          {children}
        </div>
      ),
      Body: Pass,
      List: Pass,
      Search: ({ placeholder }: { placeholder: string }) => <input aria-label="search" placeholder={placeholder} />,
      Progress: () => null,
      Pinned: () => null,
      Sections: () => <div data-testid="sections" />,
      Empty: () => null,
    },
  };
});
vi.mock("@/core/layout/fallbacks/StatusPage", () => ({ StatusPage: () => <div>error</div> }));
vi.mock("@/core/layout/fallbacks/statusActions", () => ({ RetryButton: () => null }));
let layers: unknown[] = [];
vi.mock("../../../platform/stores/sceneStore", () => ({
  useSceneStore: (selector: (s: unknown) => unknown) => selector({ layers }),
  useSceneStoreApi: () => ({ getState: () => ({ layers }) }),
}));
vi.mock("../../../platform/stores/viewerStore", () => ({
  useViewerStore: (selector: (s: unknown) => unknown) => selector({ probeLayerId: null }),
}));
vi.mock("../../../platform/layerui/layerIdentity", () => ({
  layerDisplayLabel: (layer: { name: string }) => layer.name,
}));
// The dropdown, flat: every layer a button that picks it.
let pick: (value: string) => void = () => {};
vi.mock("@/core/ui/dropdown-menu", () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return {
    DropdownMenu: Pass,
    DropdownMenuTrigger: Pass,
    DropdownMenuContent: Pass,
    DropdownMenuLabel: () => null,
    DropdownMenuRadioGroup: ({
      children,
      value,
      onValueChange,
    }: {
      children: ReactNode;
      value?: string;
      onValueChange: (value: string) => void;
    }) => {
      pick = onValueChange;
      return <div data-testid="layers" data-value={value}>{children}</div>;
    },
    DropdownMenuRadioItem: ({ children, value }: { children: ReactNode; value: string }) => (
      <button type="button" data-testid={`layer:${value}`} onClick={() => pick(value)}>
        {children}
      </button>
    ),
  };
});

import { AnnotationPairActions } from "./AnnotationPairActions";
import type { SelectedRoi } from "../roiSelectionStore";

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

const image = { id: "layer:image", name: "DAPI", lens: { id: "7", descriptors: { "@mikro/n_space_axes": 2 } } };

afterEach(cleanup);

describe("AnnotationPairActions", () => {
  it("offers what takes the pair as tiles: the shape with its descriptors, against the probed lens", () => {
    layers = [image];
    descriptorsQuery.mockReturnValue({ data: { annotation: { descriptors: { "@mikro/annotation_kind": "RECTANGLE" } } } });

    render(<AnnotationPairActions roi={roi} autoFocus={false} onDone={() => {}} />);

    expect(screen.getByTestId("menu").dataset.skin).toBe("tiles");
    const { objects, partners, sections } = menuProps.mock.lastCall![0];
    expect({ objects, partners }).toEqual({
      objects: [
        { identifier: "@mikro/annotation", id: "ann:1", label: "soma", descriptors: { "@mikro/annotation_kind": "RECTANGLE" } },
      ],
      partners: [
        { identifier: "@mikro/arraylens", id: "7", label: "DAPI", descriptors: { "@mikro/n_space_axes": 2 } },
      ],
    });
    expect(sections).toEqual({ only: ["rekuest.shortcuts", "rekuest.actions"] });
  });

  it("names the image and keeps the search behind a magnifier — open at once on a click", () => {
    layers = [image];
    descriptorsQuery.mockReturnValue({ data: { annotation: { descriptors: {} } } });

    const { unmount } = render(<AnnotationPairActions roi={roi} autoFocus={false} onDone={() => {}} />);
    expect(screen.getByLabelText("Image to run with").textContent).toBe("Run with:DAPI");
    expect(screen.queryByLabelText("search")).toBeNull();
    fireEvent.click(screen.getByLabelText("Search actions"));
    expect(screen.getByLabelText("search").getAttribute("placeholder")).toBe("Run with DAPI…");
    fireEvent.keyDown(screen.getByLabelText("search"), { key: "Escape" });
    expect(screen.queryByLabelText("search")).toBeNull();
    unmount();

    render(<AnnotationPairActions roi={roi} autoFocus onDone={() => {}} />);
    expect(screen.getByLabelText("search")).toBeTruthy();
  });

  it("runs with another layer's lens once picked — hidden ones too — and back", () => {
    const hidden = { id: "layer:gfp", name: "GFP", visible: false, lens: { id: "9", descriptors: {} } };
    layers = [image, hidden];
    descriptorsQuery.mockReturnValue({ data: { annotation: { descriptors: {} } } });
    render(<AnnotationPairActions roi={roi} autoFocus={false} onDone={() => {}} />);

    expect(screen.getByTestId("layers").dataset.value).toBe("layer:image");
    expect(screen.getByTestId("layer:layer:image").textContent).toBe("DAPIprobe");
    expect(screen.getByTestId("layer:layer:gfp").textContent).toBe("GFPhidden");

    fireEvent.click(screen.getByTestId("layer:layer:gfp"));
    expect(menuProps.mock.lastCall![0].partners).toEqual([
      { identifier: "@mikro/arraylens", id: "9", label: "GFP" },
    ]);
    expect(screen.getByLabelText("Image to run with").textContent).toBe("Run with:GFP");

    fireEvent.click(screen.getByTestId("layer:layer:image"));
    expect(menuProps.mock.lastCall![0].partners[0].id).toBe("7");
  });

  it("waits for the descriptors, and says so when there is no image to run on", () => {
    layers = [image];
    descriptorsQuery.mockReturnValue({ data: undefined });
    const { rerender } = render(<AnnotationPairActions roi={roi} autoFocus={false} onDone={() => {}} />);
    expect(screen.getByText("Loading…")).toBeTruthy();

    layers = [];
    rerender(<AnnotationPairActions roi={{ ...roi }} autoFocus={false} onDone={() => {}} />);
    expect(screen.getByText(/No image layer to run with/)).toBeTruthy();
    expect(screen.queryByTestId("menu")).toBeNull();
  });
});
