// @vitest-environment jsdom
import { ApolloClient, InMemoryCache } from "@apollo/client";
import { MockLink } from "@apollo/client/testing";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A smoke test for the registration table: does it mount, does it prefill what
 * mapping.ts says it should, and does the rename rule actually reach the UI?
 *
 * The generated hooks take their client from `useMikro()` (the Arkitekt service
 * context) rather than from an ApolloProvider, so MockedProvider cannot supply
 * it — mock the context and hand it a real client over a MockLink instead. The
 * dialog context is mocked for the same reason: useGraphQLDialog calls
 * useDialog(), and @/app/dialog pulls in the whole registry.
 */

const closeDialog = vi.fn();

vi.mock("@/app/dialog", () => ({
  useDialog: () => ({ closeDialog, openDialog: vi.fn(), openSheet: vi.fn() }),
}));

vi.mock("@/app/Arkitekt", () => ({
  useMikro: () =>
    new ApolloClient({ link: new MockLink([]), cache: new InMemoryCache() }),
  Guard: { Mikro: ({ children }: { children: React.ReactNode }) => children },
}));

// The linkers module reaches deep into the smart/provider tree; the edge form
// only needs it to render a name.
vi.mock("@/linkers", () => ({
  MikroCoordinateSystem: {
    DetailLink: ({ children }: { children: React.ReactNode }) => children,
  },
}));

import { RegisterEdgeForm } from "./RegisterEdgeForm";

const axis = (
  name: string,
  order: number,
  type: string,
  unit?: string | null,
) => ({ __typename: "Axis" as const, id: name, name, order, type, unit, longName: null });

// `residents` is the whole vocabulary a system has left: an inhabited space
// carries its containers, an empty one IS a pure reference frame.
const system = (
  id: string,
  name: string,
  residents: unknown[],
  axes: unknown[],
) =>
  ({ __typename: "CoordinateSystem", id, name, epoch: null, residents, axes }) as never;

const DATASET_RESIDENT = { __typename: "ArrayDataset", id: "ds-1", name: "stack" };

// (c, y, x) pixels -> (t, z, y, x) micrometre world: the rank-changing case.
const SOURCE = system("cs-1", "intrinsic pixels", [DATASET_RESIDENT], [
  axis("c", 0, "CHANNEL"),
  axis("y", 1, "SPACE", "px"),
  axis("x", 2, "SPACE", "px"),
]);
const TARGET = system("cs-2", "Scene 12 world", [], [
  axis("t", 0, "TIME", "s"),
  axis("z", 1, "SPACE", "µm"),
  axis("y", 2, "SPACE", "µm"),
  axis("x", 3, "SPACE", "µm"),
]);

// (y, x) -> (row, col): every mapping renames, so the rename rule must bite.
const RENAMING_SOURCE = system("cs-3", "pixels", [DATASET_RESIDENT], [
  axis("y", 0, "SPACE", "px"),
  axis("x", 1, "SPACE", "px"),
]);
const RENAMING_TARGET = system("cs-4", "atlas", [], [
  axis("row", 0, "SPACE", "µm"),
  axis("col", 1, "SPACE", "µm"),
]);

const rowFor = (name: string) => {
  const cell = screen.getByText(name, { selector: "span.font-mono" });
  const row = cell.closest("tr");
  if (!row) throw new Error(`no row for ${name}`);
  return row;
};

describe("RegisterEdgeForm", () => {
  // Radix's Select drives its trigger through the Pointer Capture API, which
  // jsdom does not implement. Without these it throws on the first click and
  // the failure looks like a component bug rather than an environment gap.
  beforeAll(() => {
    Element.prototype.hasPointerCapture = vi.fn();
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => vi.clearAllMocks());

  it("mounts and shows one row per source axis, in the source's order", () => {
    render(<RegisterEdgeForm source={SOURCE} target={TARGET} />);

    const names = screen
      .getAllByRole("row")
      .slice(1) // drop the header
      .map((row) => within(row).getAllByRole("cell")[0].textContent);

    expect(names?.[0]).toContain("c");
    expect(names?.[1]).toContain("y");
    expect(names?.[2]).toContain("x");
  });

  it("prefills the matching axes and leaves the channel axis unmapped", () => {
    render(<RegisterEdgeForm source={SOURCE} target={TARGET} />);

    expect(within(rowFor("y")).getByRole("combobox")).toHaveTextContent("y");
    expect(within(rowFor("x")).getByRole("combobox")).toHaveTextContent("x");
    expect(within(rowFor("c")).getByRole("combobox")).toHaveTextContent(
      "not mapped",
    );
  });

  it("names the target axes this edge does not produce", () => {
    render(<RegisterEdgeForm source={SOURCE} target={TARGET} />);

    expect(screen.getByText(/Untouched target axes/)).toBeInTheDocument();
    expect(screen.getByText("t, z")).toBeInTheDocument();
  });

  it("reports how many source axes are mapped", () => {
    render(<RegisterEdgeForm source={SOURCE} target={TARGET} />);
    expect(screen.getByText("2 of 3 source axes mapped")).toBeInTheDocument();
  });

  it("starts on Identity and can submit the zero-click case", () => {
    render(<RegisterEdgeForm source={SOURCE} target={TARGET} />);
    expect(screen.getByRole("button", { name: "Register" })).toBeEnabled();
  });

  it("reveals scale inputs, labelled with the TARGET axis's unit, when Scale is picked", async () => {
    const user = userEvent.setup();
    render(<RegisterEdgeForm source={SOURCE} target={TARGET} />);

    await user.click(screen.getByRole("button", { name: "Scale" }));

    // A scale converts source units into target units: µm per pixel.
    expect(within(rowFor("y")).getByText("µm")).toBeInTheDocument();
    // The unmapped channel axis gets no parameter cell.
    expect(within(rowFor("c")).getByText("—")).toBeInTheDocument();
  });

  it("blocks submit on a zero scale", async () => {
    const user = userEvent.setup();
    render(<RegisterEdgeForm source={SOURCE} target={TARGET} />);

    await user.click(screen.getByRole("button", { name: "Scale" }));
    const input = within(rowFor("y")).getByRole("textbox");
    await user.clear(input);
    await user.type(input, "0");

    expect(screen.getByRole("button", { name: "Register" })).toBeDisabled();
    expect(screen.getByText(/cannot be zero/)).toBeInTheDocument();
  });

  it("blocks submit on an emptied scale rather than sending null", async () => {
    const user = userEvent.setup();
    render(<RegisterEdgeForm source={SOURCE} target={TARGET} />);

    await user.click(screen.getByRole("button", { name: "Scale" }));
    await user.clear(within(rowFor("y")).getByRole("textbox"));

    expect(screen.getByRole("button", { name: "Register" })).toBeDisabled();
  });

  /**
   * The rename rule, reaching the UI: evalTransform reads Scale/Translation
   * parameters by input-axis name and never consults outputAxes, so a renaming
   * scale would be authored fine and silently render as a no-op. The user must
   * not be able to pick those modes here.
   */
  it("disables identity/scale/translate when the mapping renames an axis", async () => {
    const user = userEvent.setup();
    render(
      <RegisterEdgeForm source={RENAMING_SOURCE} target={RENAMING_TARGET} />,
    );

    // Prefill refuses to guess between two SPACE candidates, so map them.
    await user.click(within(rowFor("y")).getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: /row/ }));

    expect(screen.getByRole("button", { name: "Identity" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Scale" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Translate" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Scale & translate" }),
    ).toBeEnabled();
  });

  it("shows an affine grid whose shape follows the mapped rank, not the system rank", async () => {
    const user = userEvent.setup();
    render(<RegisterEdgeForm source={SOURCE} target={TARGET} />);

    await user.click(screen.getByRole("button", { name: "Affine (matrix)" }));

    // 2 mapped axes (y, x) of a 3-axis source into a 4-axis world: 2 x (2+1).
    expect(screen.getByText(/Rows are the output axes/)).toBeInTheDocument();
    const grid = screen.getAllByRole("table").at(-1)!;
    const bodyRows = within(grid).getAllByRole("row").slice(1);
    expect(bodyRows).toHaveLength(2);
    expect(within(bodyRows[0]).getAllByRole("textbox")).toHaveLength(3);
  });

  it("seeds the affine grid with the identity, never with zeros", async () => {
    const user = userEvent.setup();
    render(<RegisterEdgeForm source={SOURCE} target={TARGET} />);

    await user.click(screen.getByRole("button", { name: "Affine (matrix)" }));

    // A zero grid would be a silent data-destroying default: it collapses every
    // coordinate to the origin and is singular, so nothing can invert it back.
    const grid = screen.getAllByRole("table").at(-1)!;
    const firstRow = within(grid).getAllByRole("row")[1];
    const cells = within(firstRow).getAllByRole("textbox");
    expect(cells[0]).toHaveValue("1");
    expect(cells[1]).toHaveValue("0");
    expect(cells[2]).toHaveValue("0");
  });
});
