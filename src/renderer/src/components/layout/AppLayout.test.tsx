// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const open = vi.hoisted(() => vi.fn());
vi.mock("@/command/tabs/TabsProvider", () => ({
  useTabActions: () => ({ open, openBeside: vi.fn() }),
}));

vi.mock("@/app/components/chrome/RailChrome", () => ({
  RailChrome: () => <div>chrome</div>,
}));
vi.mock("@/app/components/chrome/AutoHideTitleBar", () => ({
  AutoHideTitleBar: () => null,
}));

import { SMART_MODEL_DROP_TYPE } from "@/constants";
import { createDragSource, installDndEngine } from "@/lib/dnd/engine";
import { dragOnto, fireDrag } from "@/lib/dnd/testing";
import { smartRegistry } from "@/providers/smart/registry";

import { AppLayout } from "./AppLayout";

/**
 * The rail container must impose its own width on its contents.
 *
 * This is the bug that shipped: the rail was wrapped in shadcn's
 * `NavigationMenu`, whose root carries `max-w-max … items-center
 * justify-center`. That sizes the container to its CONTENT and centres it, so a
 * long pinned label grew its row past the 240px rail and spilled out of both
 * sides at once — clipped on the left, over the page on the right — while every
 * `w-full` and `min-w-0` underneath appeared correct and did nothing.
 *
 * Class-level assertions on the rows could never have caught it: the rows were
 * right, their container was not. So this asserts the container.
 */
const renderLayout = () =>
  render(
    <AppLayout navigationBar={<div data-testid="rail-content">rail</div>}>
      <div>page</div>
    </AppLayout>,
  );

describe("the rail container", () => {
  it("constrains its contents rather than sizing itself to them", () => {
    renderLayout();
    const nav = screen.getByLabelText("Modules and pinned pages");

    // `max-w-max` would let a long label set the rail's width.
    expect(nav.className).not.toContain("max-w-max");
    expect(nav.className).toContain("w-full");
    expect(nav.className).toContain("min-w-0");
    expect(nav.className).toContain("overflow-hidden");
  });

  it("stretches its rows to the rail's width instead of centring them", () => {
    // `items-center` in a flex column sizes children to their content and
    // centres them — which is what made the overflow symmetrical.
    const nav = (renderLayout(), screen.getByLabelText("Modules and pinned pages"));
    expect(nav.className).toContain("items-stretch");
    expect(nav.className).not.toContain("items-center");
  });

  it("scrolls its own column rather than growing the window", () => {
    renderLayout();
    const nav = screen.getByLabelText("Modules and pinned pages");
    expect(nav.className).toContain("min-h-0");
    expect(nav.className).toContain("flex-1");
  });

  it("still renders whatever the rail is given", () => {
    renderLayout();
    // Rendered twice: once in the desktop rail, once in the mobile bottom bar.
    expect(screen.getAllByTestId("rail-content").length).toBeGreaterThan(0);
  });
});

describe("the rail surface", () => {
  it("paints no fill or edge of its own, so it is the window surface", () => {
    // A tint a few percent off `bg-sidebar` (and a hairline) read as a seam
    // beside the chrome around the page. Nothing in the rail may set a
    // surface colour; only the sticky headers repaint `bg-sidebar` itself.
    renderLayout();
    const rail = screen.getByLabelText("Modules and pinned pages").parentElement!;
    expect(rail.className).not.toMatch(/\bbg-/);
    expect(rail.className).not.toMatch(/\bborder/);
  });
});

/**
 * The rail takes a dropped card anywhere on itself — the point being the parts
 * of it that are NOT the tab strip: the gaps, and the empty run below the tabs,
 * which is most of the rail most of the time.
 */
describe("dropping a card on the rail", () => {
  let uninstall: () => void;

  /** A card held over the rail. The session is published a frame late. */
  const liftCard = async () => {
    const card = document.createElement("div");
    document.body.appendChild(card);
    createDragSource(() => ({
      kind: SMART_MODEL_DROP_TYPE,
      getData: () => ({ structures: [{ identifier: "@x/thing", id: "9" }] }),
    })).attach(card);
    await act(async () => {
      fireDrag(card, "dragstart");
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    });
    return card;
  };

  const rail = () => screen.getByLabelText("Modules and pinned pages").parentElement!;

  beforeEach(() => {
    vi.clearAllMocks();
    smartRegistry.register({
      identifier: "@x/thing",
      name: "Thing",
      path: "/x/things",
      datum: true,
    });
    uninstall = installDndEngine(document);
  });

  afterEach(() => uninstall());

  it("opens it as a tab, let go on the rail itself", async () => {
    renderLayout();
    const card = await liftCard();
    act(() => {
      dragOnto(card, rail()).drop();
    });
    expect(open).toHaveBeenCalledWith(
      "/x/things/9",
      expect.objectContaining({ label: "Thing 9", evict: true }),
    );
  });

  it("gives up the window-drag region while a card is in the air, and takes it back after", async () => {
    renderLayout();
    // At rest the rail moves the window; `getChromeMode` decides whether it
    // says so at all, so this only asserts the two do not contradict.
    const dragRegionAtRest = rail().className.includes("app-drag");

    const card = await liftCard();
    expect(rail().className).toContain("app-no-drag");

    await act(async () => {
      fireDrag(card, "dragend");
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    });
    expect(rail().className).not.toContain("app-no-drag");
    expect(rail().className.includes("app-drag")).toBe(dragRegionAtRest);
  });

  it("draws the invitation over the rail rather than colouring the rail itself", async () => {
    renderLayout();
    expect(screen.queryByTestId("rail-drop-overlay")).toBeNull();

    await liftCard();
    const overlay = screen.getByTestId("rail-drop-overlay");
    expect(overlay.className).toContain("pointer-events-none");
    // The rail surface stays clean — the assertion the rail's own test makes.
    expect(rail().className).not.toMatch(/\bbg-/);
  });
});
