// @vitest-environment jsdom
import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const actionQuery = vi.fn();
const ensureLens = vi.fn();
vi.mock("@/mikro/api/graphql", () => ({
  useGetAnnotationActionDescriptorsQuery: (options: unknown) => actionQuery(options),
  useEnsureArrayLensMutation: () => [ensureLens],
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
  useViewerStore: (selector: (s: unknown) => unknown) => selector({ dataLayerId: null }),
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

afterEach(() => {
  cleanup();
  menuProps.mockClear();
  ensureLens.mockReset();
  actionQuery.mockReset();
});

/** The last props each menu was drawn with: the pair's subject is the shape, the crop's a lens. */
const lastMenu = (identifier: string) =>
  menuProps.mock.calls.filter(([props]) => props.objects[0]?.identifier === identifier).at(-1)?.[0];
const pairMenu = () => lastMenu("@mikro/annotation");
const cropMenu = () => lastMenu("@mikro/arraylens");

/** The card's one answer: the shape's descriptors, and its crop's of the lens. */
const answer = (descriptors: unknown, descriptorsUnder?: unknown) => ({
  data: { annotation: { id: "ann:1", descriptors, descriptorsUnder } },
});

describe("AnnotationPairActions", () => {
  it("offers what takes the pair as tiles: the shape with its descriptors, against the data lens", () => {
    layers = [image];
    actionQuery.mockReturnValue(answer({ "@mikro/annotation_kind": "RECTANGLE" }));

    render(<AnnotationPairActions roi={roi} autoFocus={false} onDone={() => {}} />);

    expect(screen.getByTestId("menu").dataset.skin).toBe("tiles");
    const { objects, partners, sections } = pairMenu();
    expect({ objects, partners }).toEqual({
      objects: [
        { identifier: "@mikro/annotation", id: "ann:1", label: "soma", descriptors: { "@mikro/annotation_kind": "RECTANGLE" } },
      ],
      partners: [
        { identifier: "@mikro/arraylens", id: "7", label: "DAPI", descriptors: { "@mikro/n_space_axes": 2 } },
      ],
    });
    expect(sections).toEqual({ only: ["rekuest.shortcuts", "rekuest.actions", "kabinet.definitions"] });
  });

  it("names the image and keeps the search behind a magnifier — open at once on a click", () => {
    layers = [image];
    actionQuery.mockReturnValue(answer({}));

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
    actionQuery.mockReturnValue(answer({}));
    render(<AnnotationPairActions roi={roi} autoFocus={false} onDone={() => {}} />);

    expect(screen.getByTestId("layers").dataset.value).toBe("layer:image");
    expect(screen.getByTestId("layer:layer:image").textContent).toBe("DAPIdata");
    expect(screen.getByTestId("layer:layer:gfp").textContent).toBe("GFPhidden");

    fireEvent.click(screen.getByTestId("layer:layer:gfp"));
    expect(pairMenu().partners).toEqual([
      { identifier: "@mikro/arraylens", id: "9", label: "GFP" },
    ]);
    expect(screen.getByLabelText("Image to run with").textContent).toBe("Run with:GFP");

    fireEvent.click(screen.getByTestId("layer:layer:image"));
    expect(pairMenu().partners[0].id).toBe("7");
  });

  it("waits for the descriptors, and says so when there is no image to run on", () => {
    layers = [image];
    actionQuery.mockReturnValue({ data: undefined });
    const { rerender } = render(<AnnotationPairActions roi={roi} autoFocus={false} onDone={() => {}} />);
    expect(screen.getByText("Loading…")).toBeTruthy();

    layers = [];
    rerender(<AnnotationPairActions roi={{ ...roi }} autoFocus={false} onDone={() => {}} />);
    expect(screen.getByText(/No image layer to run with/)).toBeTruthy();
    expect(screen.queryByTestId("menu")).toBeNull();
  });

  it("offers what takes the crop, with the descriptors mikro says it would have, and makes nothing to list them", () => {
    layers = [image];
    actionQuery.mockReturnValue(answer({}, { "@mikro/spec": ["IMAGE"], "@mikro/is_whole": false }));

    render(<AnnotationPairActions roi={roi} autoFocus={false} onDone={() => {}} />);

    expect(actionQuery.mock.lastCall![0]).toEqual({ variables: { id: "ann:1", lens: "7" }, skip: false });
    expect(screen.getByText("On the crop to this shape")).toBeTruthy();
    const { objects, partners, sections, materialize } = cropMenu();
    expect({ objects, partners, sections }).toEqual({
      objects: [
        {
          identifier: "@mikro/arraylens",
          id: "cut:7:ann:1",
          label: "soma on DAPI",
          descriptors: { "@mikro/spec": ["IMAGE"], "@mikro/is_whole": false },
        },
      ],
      partners: [],
      sections: { only: ["rekuest.shortcuts", "rekuest.actions", "kabinet.definitions"] },
    });
    expect(typeof materialize).toBe("function");
    expect(pairMenu().materialize).toBeUndefined();
    expect(ensureLens).not.toHaveBeenCalled();
  });

  it("makes the crop when something runs on it, once, and asks again after a failure", async () => {
    layers = [image];
    actionQuery.mockReturnValue(answer({}, { "@mikro/spec": ["IMAGE"] }));
    render(<AnnotationPairActions roi={roi} autoFocus={false} onDone={() => {}} />);
    const { materialize } = cropMenu();

    ensureLens.mockRejectedValueOnce(new Error("The box lies outside the lens"));
    await expect(materialize()).rejects.toThrow(/Could not make the crop/);

    ensureLens.mockResolvedValue({ data: { createLens: { id: "42" } } });
    const made = { objects: [{ identifier: "@mikro/arraylens", id: "42", label: "soma on DAPI", descriptors: { "@mikro/spec": ["IMAGE"] } }], partners: [] };
    await act(async () => {
      await expect(materialize()).resolves.toEqual(made);
      await expect(materialize()).resolves.toEqual(made);
    });
    expect(ensureLens).toHaveBeenCalledTimes(2);
    expect(ensureLens.mock.lastCall![0]).toMatchObject({ variables: { input: { lens: "7", annotation: "ann:1" } } });
  });

  it("says when the shape misses the image, and lists nothing on a crop that cannot be made", () => {
    layers = [image];
    actionQuery.mockReturnValue(answer({}, null));
    render(<AnnotationPairActions roi={roi} autoFocus={false} onDone={() => {}} />);

    expect(screen.getByText("This shape lies outside DAPI.")).toBeTruthy();
    expect(cropMenu()).toBeUndefined();
  });
});
