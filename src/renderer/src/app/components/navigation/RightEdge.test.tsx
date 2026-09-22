// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const openBeside = vi.hoisted(() => vi.fn());
vi.mock("@/command/tabs/TabsProvider", () => ({
  useTabActions: () => ({ open: vi.fn(), openBeside }),
}));

// The strip itself has its own tests; here it is only what the panel holds.
vi.mock("./RailTabs", () => ({ default: () => <div data-testid="rail-tabs" /> }));

// The panel's exit waits for a tween that never finishes in jsdom, and the
// leaving node would linger and defeat every "it closed" assertion. What is
// tested here is when the edge shows what, not the slide.
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const MOTION_ONLY = ["initial", "animate", "exit", "transition", "layout"];
  const cache = new Map<string, React.ElementType>();
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        if (!cache.has(tag)) {
          cache.set(tag, (props: Record<string, unknown>) => {
            const rest = { ...props };
            for (const key of MOTION_ONLY) delete rest[key];
            return React.createElement(tag, rest);
          });
        }
        return cache.get(tag);
      },
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReducedMotion: () => false,
  };
});

import { SMART_MODEL_DROP_TYPE } from "@/constants";
import { createDragSource, installDndEngine } from "@/lib/dnd/engine";
import { dragOnto, fireDrag } from "@/lib/dnd/testing";
import { smartRegistry } from "@/providers/smart/registry";

import { RightEdge } from "./RightEdge";

/**
 * A card in the air, carrying a structure.
 *
 * The engine publishes the session a frame late on purpose — Chromium takes
 * the drag image after `dragstart` and cancels the drag if the page moves
 * under it — so the test waits that frame out.
 */
const beginDrag = async () => {
  const card = document.createElement("div");
  document.body.appendChild(card);
  createDragSource(() => ({
    kind: SMART_MODEL_DROP_TYPE,
    getData: () => ({ structures: [{ identifier: "@x/thing", object: { id: "1" } }] }),
  })).attach(card);

  await act(async () => {
    fireDrag(card, "dragstart");
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
  return card;
};

const sentinel = () => screen.getByTestId("right-edge-sentinel");
/** Open, as the page sees it: the panel has width and the tabs are in it. */
const isOpen = () =>
  screen.queryByTestId("right-edge-tabs")?.getAttribute("data-state") === "revealed";

let uninstall: () => void;

beforeEach(() => {
  vi.clearAllMocks();
  smartRegistry.register({ identifier: "@x/thing", name: "Thing", path: "/x/things", datum: true });
  uninstall = installDndEngine(document);
});

afterEach(() => uninstall());

describe("the window's right edge", () => {
  it("takes no room, and holds no tab strip, until the pointer reaches the edge", () => {
    render(<RightEdge />);
    expect(isOpen()).toBe(false);
    expect(screen.getByTestId("right-edge-tabs").style.width).toBe("0px");
    expect(screen.queryByTestId("rail-tabs")).toBeNull();
  });

  it("slides the tabs in when the pointer touches the edge, pushing the page aside", () => {
    render(<RightEdge />);
    fireEvent.mouseEnter(sentinel());
    expect(isOpen()).toBe(true);
    expect(screen.getByTestId("right-edge-tabs").style.width).toBe("var(--rail-width)");
    expect(screen.getByTestId("rail-tabs")).toBeTruthy();
  });

  it("closes on a move that lands clearly left of the panel", () => {
    render(<RightEdge />);
    fireEvent.mouseEnter(sentinel());
    const panel = screen.getByTestId("right-edge-tabs");
    vi.spyOn(panel, "getBoundingClientRect").mockReturnValue({ left: 800 } as DOMRect);

    // Still on it: silence means "on the panel", as with the title bar.
    act(() => {
      fireEvent.mouseMove(document, { clientX: 820 });
    });
    expect(isOpen()).toBe(true);

    act(() => {
      fireEvent.mouseMove(document, { clientX: 400 });
    });
    expect(isOpen()).toBe(false);
  });

  it("keeps the panel while the pointer is on a menu it opened", () => {
    render(<RightEdge />);
    fireEvent.mouseEnter(sentinel());
    const panel = screen.getByTestId("right-edge-tabs");
    vi.spyOn(panel, "getBoundingClientRect").mockReturnValue({ left: 800 } as DOMRect);

    const menu = document.createElement("div");
    menu.setAttribute("role", "menu");
    document.body.appendChild(menu);
    act(() => {
      fireEvent.mouseMove(menu, { clientX: 400 });
    });
    expect(isOpen()).toBe(true);
  });

  it("closes on Escape", () => {
    render(<RightEdge />);
    fireEvent.mouseEnter(sentinel());
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(isOpen()).toBe(false);
  });

  it("becomes the drop band — and only that — while a card is in the air", async () => {
    render(<RightEdge />);
    fireEvent.mouseEnter(sentinel());
    await beginDrag();

    expect(screen.getByTestId("right-edge-drop")).toBeTruthy();
    expect(screen.queryByTestId("right-edge-tabs")).toBeNull();
    expect(screen.queryByTestId("right-edge-sentinel")).toBeNull();
  });

  it("opens what is let go on the band beside the page", async () => {
    render(<RightEdge />);
    const card = await beginDrag();
    act(() => {
      dragOnto(card, screen.getByTestId("right-edge-drop")).drop();
    });
    expect(openBeside).toHaveBeenCalledWith(
      "/x/things/1",
      expect.objectContaining({ evict: true }),
    );
  });
});
