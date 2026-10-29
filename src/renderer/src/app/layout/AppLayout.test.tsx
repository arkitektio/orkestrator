// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const open = vi.hoisted(() => vi.fn());
vi.mock("@/core/tabs/TabsProvider", () => ({
  useTabActions: () => ({ open, openBeside: vi.fn() }),
}));

vi.mock("@/app/components/chrome/RailChrome", () => ({
  RailChrome: () => <div>chrome</div>,
}));
// Reads the settings store; it has its own test.
vi.mock("@/app/components/chrome/RailBackdrop", () => ({
  RailBackdrop: () => null,
}));
vi.mock("@/app/components/chrome/AutoHideTitleBar", () => ({
  AutoHideTitleBar: () => null,
}));
// Reads the settings store; it has its own test.
vi.mock("@/core/layout/pageSidebarToggle", () => ({
  PageSidebarShortcut: () => null,
}));
// Reads the settings store; it has its own test. Floating is flipped per test.
const float = vi.hoisted(() => ({ floating: false }));
vi.mock("@/app/components/chrome/railFloat", () => ({
  useRailFloating: () => float.floating,
  useRailFloatShortcut: () => undefined,
}));

import { SMART_MODEL_DROP_TYPE } from "@/core/constants";
import { createDragSource, installDndEngine } from "@/core/dnd/engine";
import { dragOnto, fireDrag } from "@/core/dnd/testing";
import { smartRegistry } from "@/core/smart/registry";

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

/**
 * Floating, the rail leaves the layout and slides in over the page from the
 * left edge. The same element either way, so nothing in it remounts.
 */
describe("the floating rail", () => {
  const rail = () => screen.getByLabelText("Modules and pinned pages").parentElement!;

  /** A move somewhere over the page, far right of the rail (jsdom rects are 0). */
  const moveOverPage = () =>
    act(() => {
      document.dispatchEvent(new MouseEvent("pointermove", { clientX: 600, bubbles: true }));
    });

  beforeEach(() => {
    float.floating = true;
    vi.useFakeTimers();
  });

  afterEach(() => {
    float.floating = false;
    vi.useRealTimers();
  });

  it("is tucked away off the edge, out of the layout and out of reach", () => {
    renderLayout();
    expect(rail().dataset.railFloating).toBe("tucked");
    expect(rail().className).toContain("absolute");
    expect(rail().className).toContain("-translate-x-");
    expect(rail().hasAttribute("inert")).toBe(true);
    // Over the page it is never a drag region of its own.
    expect(rail().className).not.toMatch(/(^|\s)app-drag(\s|$)/);
    expect(screen.getByTestId("rail-float-sentinel")).toBeTruthy();
  });

  it("slides in from the left edge, and away once the pointer is over the page", () => {
    renderLayout();
    fireEvent.pointerEnter(screen.getByTestId("rail-float-sentinel"));
    expect(rail().dataset.railFloating).toBe("revealed");
    expect(rail().hasAttribute("inert")).toBe(false);
    expect(rail().className).not.toContain("-translate-x-");
    expect(screen.queryByTestId("rail-float-sentinel")).toBeNull();

    moveOverPage();
    // A grace, not a snap: overshooting the edge for a moment is forgiven.
    expect(rail().dataset.railFloating).toBe("revealed");
    act(() => vi.advanceTimersByTime(250));
    expect(rail().dataset.railFloating).toBe("tucked");
  });

  it("stays out while a menu opened from it is open", () => {
    renderLayout();
    fireEvent.pointerEnter(screen.getByTestId("rail-float-sentinel"));

    // What a portaled chrome overlay looks like (`ChromeSurface.tsx`).
    const menu = document.createElement("div");
    menu.className = "chrome-zoom app-no-drag";
    menu.dataset.state = "open";
    document.body.appendChild(menu);

    moveOverPage();
    act(() => vi.advanceTimersByTime(250));
    expect(rail().dataset.railFloating).toBe("revealed");

    menu.remove();
    moveOverPage();
    act(() => vi.advanceTimersByTime(250));
    expect(rail().dataset.railFloating).toBe("tucked");
  });

  it("goes away on Escape", () => {
    renderLayout();
    fireEvent.pointerEnter(screen.getByTestId("rail-float-sentinel"));
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(rail().dataset.railFloating).toBe("tucked");
  });

  it("docked, sits in the layout as before", () => {
    float.floating = false;
    renderLayout();
    expect(rail().dataset.railFloating).toBeUndefined();
    expect(rail().className).toContain("relative");
    expect(rail().className).not.toContain("absolute");
    expect(rail().hasAttribute("inert")).toBe(false);
    expect(screen.queryByTestId("rail-float-sentinel")).toBeNull();
  });
});
