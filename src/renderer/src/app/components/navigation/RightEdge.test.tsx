// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const openBeside = vi.hoisted(() => vi.fn());
vi.mock("@/command/tabs/TabsProvider", () => ({
  useTabActions: () => ({ open: vi.fn(), openBeside }),
}));

// The band's fade-in is a tween that never finishes in jsdom. What is tested
// here is when the edge shows what, not the fade.
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
    getData: () => ({ structures: [{ identifier: "@x/thing", id: "1" }] }),
  })).attach(card);

  await act(async () => {
    fireDrag(card, "dragstart");
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
  return card;
};

let uninstall: () => void;

beforeEach(() => {
  vi.clearAllMocks();
  smartRegistry.register({ identifier: "@x/thing", name: "Thing", path: "/x/things", datum: true });
  uninstall = installDndEngine(document);
});

afterEach(() => uninstall());

describe("the window's right edge", () => {
  it("is nothing at rest, so it cannot swallow clicks meant for the page", () => {
    render(<RightEdge />);
    expect(screen.queryByTestId("right-edge-drop")).toBeNull();
    // The tab peek that used to live here is gone.
    expect(screen.queryByTestId("right-edge-tabs")).toBeNull();
    expect(screen.queryByTestId("right-edge-sentinel")).toBeNull();
  });

  it("waits invisibly at the edge while a card is in the air", async () => {
    render(<RightEdge />);
    await beginDrag();
    expect(screen.getByTestId("right-edge-drop").getAttribute("data-state")).toBe("closed");
    // Nothing drawn: only the empty catch strip, the panel shut.
    expect(screen.getByTestId("right-edge-catch").childElementCount).toBe(0);
  });

  it("slides open, pushing the page aside, when the card reaches it", async () => {
    render(<RightEdge />);
    const card = await beginDrag();
    act(() => {
      dragOnto(card, screen.getByTestId("right-edge-catch"));
    });
    expect(screen.getByTestId("right-edge-drop").getAttribute("data-state")).toBe("open");
  });

  it("stays open while the card rests on the edge it opened", async () => {
    // The panel opens from 0px, so the pointer is still over the catch for
    // the next dragover; the catch stepping aside flickered the edge shut.
    render(<RightEdge />);
    const card = await beginDrag();
    const catchStrip = screen.getByTestId("right-edge-catch");
    act(() => {
      dragOnto(card, catchStrip);
    });
    expect(catchStrip.className).not.toContain("pointer-events-none");
    act(() => {
      fireDrag(catchStrip, "dragover");
    });
    expect(screen.getByTestId("right-edge-drop").getAttribute("data-state")).toBe("open");
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
