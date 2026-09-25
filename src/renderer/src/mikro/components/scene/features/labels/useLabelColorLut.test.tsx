// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The label colour LUT's LIFECYCLE, which is the reason it is a shared hook
 * rather than two copies: an async build with a cancellation protocol, where the
 * cancelled branch owns a GPU texture nobody else will free.
 *
 * The build itself is covered by `labelColorLut.test.ts`; this is only about
 * what the hook does with the result.
 */

const invalidate = vi.fn();
vi.mock("@react-three/fiber", () => ({
  useThree: (selector: (s: unknown) => unknown) => selector({ invalidate }),
}));

const attributeService: { current: unknown } = { current: undefined };
vi.mock("@/mikro/lib/attributes/AttributeServiceProvider", () => ({
  useAttributeServiceOrNull: () => attributeService.current,
}));

const setLabelColorLut = vi.fn();
// The hook reaches for the client and the datalayer endpoint to answer a SPARSE
// colouring. These cover the COLUMN arm, which touches neither.
vi.mock("@/app/Arkitekt", () => ({
  useMikro: () => ({ mutate: vi.fn(), query: vi.fn() }),
  useDatalayerEndpoint: () => "https://datalayer.test",
}));

const setLabelColorStyle = vi.fn();
vi.mock("./labelNodeMaterials", () => ({
  setLabelColorLut: (...args: unknown[]) => setLabelColorLut(...args),
  setLabelColorStyle: (...args: unknown[]) => setLabelColorStyle(...args),
}));

// The appearance effect builds a palette row; the row itself is not what these
// cover, and a real one wants a GPU-shaped texture.
vi.mock("../../platform/attributes/valueLut", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  paletteRowFor: () => null,
}));

const buildLabelColorLut = vi.fn();
vi.mock("./labelColorLut", () => ({
  buildLabelColorLut: (...args: unknown[]) => buildLabelColorLut(...args),
}));

vi.mock("../../platform/model/layerLevel0", () => ({
  systemIdOf: () => "sys-1",
  level0StoreIdOf: () => "store-1",
}));

// The hook bumps the volume compositor's input tracker alongside invalidate.
const volumeInputsBump = vi.fn();
vi.mock("../../platform/stores/viewerStore", () => ({
  useViewerStoreApi: () => ({
    getState: () => ({ volumeInputs: { bump: volumeInputsBump } }),
  }),
}));

const { useLabelColorLut } = await import("./useLabelColorLut");

const NODES = { uLutColorize: { value: 0 } } as never;

const layerWith = (render: unknown) => ({ id: "l", labelRender: render }) as never;

/** A layer with one colouring picked — enough to make the hook build. */
const ACTIVE = layerWith({
  colorBys: [{ table: "t", column: "area", joinPath: [] }],
  activeColorBy: 0,
  filterBys: [],
  activeFilterBys: [],
});

const Harness = ({ layer }: { layer: unknown }) => {
  useLabelColorLut(NODES, layer as never);
  return null;
};

beforeEach(() => {
  vi.clearAllMocks();
  attributeService.current = {
    engine: {},
    plansFor: vi.fn().mockResolvedValue([]),
  };
});

describe("useLabelColorLut", () => {
  it("switches the LUT OFF when nothing is picked", () => {
    render(
      <Harness
        layer={layerWith({ colorBys: [], activeColorBy: null, filterBys: [], activeFilterBys: [] })}
      />,
    );
    expect(setLabelColorLut).toHaveBeenCalledWith(
      NODES,
      { texture: null, width: 0, height: 0, idOffset: 0, valueMin: 0, valueMax: 1 },
      { colorize: false, filter: false },
    );
    expect(buildLabelColorLut).not.toHaveBeenCalled();
  });

  it("switches it off when there is no attribute service to read with", () => {
    attributeService.current = null;
    render(<Harness layer={ACTIVE} />);
    expect(setLabelColorLut).toHaveBeenCalledWith(
      NODES,
      expect.objectContaining({ texture: null }),
      { colorize: false, filter: false },
    );
  });

  it("binds a built LUT and requests a frame", async () => {
    const texture = { dispose: vi.fn() };
    buildLabelColorLut.mockResolvedValue({
      texture,
      width: 4,
      height: 1,
      idOffset: 1,
      skipped: [],
    });
    render(<Harness layer={ACTIVE} />);
    await waitFor(() => expect(setLabelColorLut).toHaveBeenCalled());
    expect(setLabelColorLut).toHaveBeenCalledWith(
      NODES,
      expect.objectContaining({ texture, idOffset: 1 }),
      { colorize: true, filter: false },
    );
    expect(texture.dispose).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalled();
  });

  it("does NOT rebuild the table when only the window or the colormap moves", async () => {
    // The point of the value encoding. The table used to be keyed on the whole
    // entry, so nudging a clim re-ran the read, repainted every slot and
    // re-uploaded the texture — at a bin lattice's scale, tens of megabytes to
    // change how a number becomes a hue. Now it is two uniform writes.
    buildLabelColorLut.mockResolvedValue({
      texture: { dispose: vi.fn() },
      width: 4,
      height: 1,
      idOffset: 1,
      skipped: [],
      valueMin: 0,
      valueMax: 10,
    });

    const { rerender } = render(<Harness layer={ACTIVE} />);
    await waitFor(() => expect(setLabelColorLut).toHaveBeenCalled());
    expect(buildLabelColorLut).toHaveBeenCalledTimes(1);
    expect(setLabelColorStyle).toHaveBeenCalledTimes(1);

    // Same column, different appearance.
    const restyled = layerWith({
      colorBys: [
        { table: "t", column: "area", joinPath: [], colormap: "MAGMA", min: 2, max: 8 },
      ],
      activeColorBy: 0,
      filterBys: [],
      activeFilterBys: [],
    });
    rerender(<Harness layer={restyled} />);
    await waitFor(() => expect(setLabelColorStyle).toHaveBeenCalledTimes(2));

    expect(buildLabelColorLut).toHaveBeenCalledTimes(1); // the table is untouched
    expect(setLabelColorStyle).toHaveBeenLastCalledWith(
      NODES,
      expect.objectContaining({ climMin: 2, climMax: 8 }),
    );
  });

  it("DOES rebuild when the colormap crosses the qualitative boundary", async () => {
    // The distinction the two-key split turns on, and the one this path used
    // to get backwards. `buildValueLut` writes RANKS for a qualitative
    // colormap and normalised VALUES otherwise, so the colormap's CLASS is
    // data, not appearance — while the colormap itself (MAGMA -> INFERNO)
    // stays appearance. Keying the table without the class left rank colours
    // being sampled with value-derived codes.
    buildLabelColorLut.mockResolvedValue({
      texture: { dispose: vi.fn() },
      width: 4,
      height: 1,
      idOffset: 1,
      skipped: [],
      valueMin: 0,
      valueMax: 10,
    });
    const { rerender } = render(<Harness layer={ACTIVE} />);
    await waitFor(() => expect(buildLabelColorLut).toHaveBeenCalledTimes(1));

    rerender(
      <Harness
        layer={layerWith({
          // Same column, same window — only continuous -> categorical.
          colorBys: [{ table: "t", column: "area", joinPath: [], colormap: "HUES" }],
          activeColorBy: 0,
          filterBys: [],
          activeFilterBys: [],
        })}
      />,
    );
    await waitFor(() => expect(buildLabelColorLut).toHaveBeenCalledTimes(2));
  });

  it("DOES rebuild when the column changes", async () => {
    buildLabelColorLut.mockResolvedValue({
      texture: { dispose: vi.fn() },
      width: 4,
      height: 1,
      idOffset: 1,
      skipped: [],
      valueMin: 0,
      valueMax: 10,
    });
    const { rerender } = render(<Harness layer={ACTIVE} />);
    await waitFor(() => expect(buildLabelColorLut).toHaveBeenCalledTimes(1));

    rerender(
      <Harness
        layer={layerWith({
          colorBys: [{ table: "t", column: "volume", joinPath: [] }],
          activeColorBy: 0,
          filterBys: [],
          activeFilterBys: [],
        })}
      />,
    );
    await waitFor(() => expect(buildLabelColorLut).toHaveBeenCalledTimes(2));
  });

  it("DISPOSES a superseded build instead of binding it", async () => {
    // The leak this protocol exists for: `setLabelColorLut` only ever frees the
    // texture it REPLACES, so one that never got bound is the hook's to free.
    const texture = { dispose: vi.fn() };
    let release: (v: unknown) => void = () => {};
    buildLabelColorLut.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const view = render(<Harness layer={ACTIVE} />);
    // The effect first awaits `plansFor`; wait until it has actually reached the
    // build, or unmounting would cancel it at the earlier await and no texture
    // would ever exist to leak.
    await waitFor(() => expect(buildLabelColorLut).toHaveBeenCalled());
    view.unmount();
    release({ texture, width: 4, height: 1, idOffset: 0, skipped: [] });
    await waitFor(() => expect(texture.dispose).toHaveBeenCalled());
    // …and it never reached the GPU.
    expect(setLabelColorLut).not.toHaveBeenCalledWith(
      NODES,
      expect.objectContaining({ texture }),
      expect.anything(),
    );
  });

  it("switches the LUT off when the build throws, rather than leaving a stale one", async () => {
    buildLabelColorLut.mockRejectedValue(new Error("no grant"));
    render(<Harness layer={ACTIVE} />);
    await waitFor(() =>
      expect(setLabelColorLut).toHaveBeenCalledWith(
        NODES,
        expect.objectContaining({ texture: null }),
        { colorize: false, filter: false },
      ),
    );
  });

  it("turns FILTER on when rules are active", async () => {
    buildLabelColorLut.mockResolvedValue({
      texture: {},
      width: 1,
      height: 1,
      idOffset: 0,
      skipped: [],
    });
    render(
      <Harness
        layer={layerWith({
          colorBys: [],
          activeColorBy: null,
          filterBys: [{ table: "t", column: "area", exclude: false, joinPath: [] }],
          activeFilterBys: [0],
        })}
      />,
    );
    await waitFor(() =>
      expect(setLabelColorLut).toHaveBeenCalledWith(NODES, expect.anything(), {
        colorize: false,
        filter: true,
      }),
    );
  });
});
