// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommandItem } from "@/core/ui/command";

vi.mock("@/core/util/hooks/use-debounce", () => ({ useDebounce: <T,>(value: T) => value }));

vi.mock("@/core/connection/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/connection/arkitekt/host")>()),
  Arkitekt: { useActiveProfileId: () => "org-a" },
}));

import { CommandActionRow } from "./CommandActionRow";
import { SmartContext } from "./context";
import { resetSmartPinsCache, smartPinsStorageKey } from "./pins";
import type { SectionItems, SmartContextSection } from "./section";
import { createSmartSectionRegistry } from "./sectionRegistry";

/** A remote section whose answer the test flips from outside. */
const remoteStore = () => {
  let state: SectionItems<string> = { items: undefined, status: "loading" };
  const listeners = new Set<() => void>();
  return {
    set(next: SectionItems<string>) {
      state = next;
      listeners.forEach((listener) => listener());
    },
    use: () =>
      React.useSyncExternalStore(
        (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        () => state,
        () => state,
      ),
  };
};

const row = (prefix: string) =>
  function Row({ item }: { item: string }) {
    return <CommandItem value={`${prefix}-${item}`}>{`${prefix} ${item}`}</CommandItem>;
  };

const instantSection = (items: readonly string[]): SmartContextSection<string> => ({
  id: "local.actions",
  module: "local",
  title: "Default",
  priority: 0,
  tier: "instant",
  applies: () => true,
  useItems: () => ({ items, status: "ready" }),
  itemKey: (item) => item,
  Row: row("Instant"),
});

const remoteSection = (store: ReturnType<typeof remoteStore>): SmartContextSection<string> => ({
  id: "rekuest.actions",
  module: "rekuest",
  title: "Run",
  priority: 40,
  tier: "remote",
  applies: () => true,
  useItems: store.use,
  itemKey: (item) => item,
  Row: row("Remote"),
});

const objects = [{ identifier: "@mikro/image", id: "1" }];

describe("SmartContext", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("paints the instant tier first, mounts the remote tier a frame later, and keeps DOM order", () => {
    const store = remoteStore();
    const registry = createSmartSectionRegistry([remoteSection(store), instantSection(["a", "b"])]);
    render(<SmartContext registry={registry} objects={objects} />);

    expect(screen.getByText("Instant a")).toBeInTheDocument();
    expect(screen.queryByText(/Remote/)).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("No Action available")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersToNextFrame();
    });
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-busy", "true");

    act(() => {
      store.set({ items: ["x", "y"], status: "ready" });
    });
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-busy", "false");
    const texts = screen.getAllByText(/^(Instant|Remote) /).map((node) => node.textContent);
    expect(texts).toEqual(["Instant a", "Instant b", "Remote x", "Remote y"]);
  });

  it("says nothing is available only once every section has settled empty", () => {
    const store = remoteStore();
    const registry = createSmartSectionRegistry([instantSection([]), remoteSection(store)]);
    render(<SmartContext registry={registry} objects={objects} />);

    expect(screen.queryByText("No Action available")).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersToNextFrame();
    });
    expect(screen.queryByText("No Action available")).not.toBeInTheDocument();

    act(() => {
      store.set({ items: [], status: "ready" });
    });
    expect(screen.getByText("No Action available")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-busy", "false");

    act(() => {
      store.set({ items: ["z"], status: "ready" });
    });
    expect(screen.queryByText("No Action available")).not.toBeInTheDocument();
    expect(screen.getByText("Remote z")).toBeInTheDocument();
  });

  it("leaves out sections the caller excluded", () => {
    const store = remoteStore();
    const registry = createSmartSectionRegistry([instantSection(["a"]), remoteSection(store)]);
    render(
      <SmartContext registry={registry} objects={objects} sections={{ exclude: ["rekuest"] }} />,
    );
    act(() => {
      vi.advanceTimersToNextFrame();
    });
    // Nothing remote is expected, so the menu is settled at once.
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-busy", "false");
    expect(screen.getByText("Instant a")).toBeInTheDocument();
  });

  describe("pins", () => {
    const ran = vi.fn();
    /** Rows through the shared row, as every module's are. */
    const actionSection = (
      id: "local.actions" | "rekuest.actions",
      items: readonly string[],
      extra: Partial<SmartContextSection<string>> = {},
    ): SmartContextSection<string> => ({
      id,
      module: id.split(".")[0],
      title: id,
      priority: id === "local.actions" ? 0 : 40,
      tier: "instant",
      applies: () => true,
      useItems: () => ({ items, status: "ready" }),
      itemKey: (item) => item,
      Row: ({ item }) => (
        <CommandActionRow value={`${id}-${item}`} title={item} onSelect={() => ran(item)} />
      ),
      ...extra,
    });

    const registry = () =>
      createSmartSectionRegistry([
        actionSection("local.actions", ["Open"]),
        actionSection("rekuest.actions", ["Segment", "Denoise"]),
      ]);
    const pinnedGroup = () => screen.getByRole("group", { name: "Pinned actions" });
    const order = () =>
      screen.getAllByText(/^(Open|Segment|Denoise)$/).map((node) => node.textContent);

    beforeEach(() => {
      // cmdk scrolls its selection into view; jsdom has no layout to do it in.
      Element.prototype.scrollIntoView = vi.fn();
      localStorage.clear();
      resetSmartPinsCache();
      ran.mockClear();
    });

    it("moves a pinned server-side row to the start without running it", () => {
      render(<SmartContext registry={registry()} objects={objects} />);
      expect(pinnedGroup()).toBeEmptyDOMElement();
      expect(order()).toEqual(["Open", "Segment", "Denoise"]);

      fireEvent.click(screen.getByRole("button", { name: "Pin Denoise" }));
      expect(ran).not.toHaveBeenCalled();
      // Moved, not copied: above the local rows, and once.
      expect(within(pinnedGroup()).getByText("Denoise")).toBeInTheDocument();
      expect(order()).toEqual(["Denoise", "Open", "Segment"]);

      fireEvent.click(within(pinnedGroup()).getByText("Denoise"));
      expect(ran).toHaveBeenCalledWith("Denoise");
    });

    it("persists per profile and reads the pin back on the next open", () => {
      const first = render(<SmartContext registry={registry()} objects={objects} />);
      fireEvent.click(screen.getByRole("button", { name: "Pin Denoise" }));
      expect(JSON.parse(localStorage.getItem(smartPinsStorageKey("org-a"))!)).toEqual([
        "rekuest.actions:Denoise",
      ]);
      first.unmount();
      resetSmartPinsCache();

      render(<SmartContext registry={registry()} objects={objects} />);
      expect(within(pinnedGroup()).getByText("Denoise")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Unpin Denoise" }));
      expect(pinnedGroup()).toBeEmptyDOMElement();
      expect(order()).toEqual(["Open", "Segment", "Denoise"]);
      expect(JSON.parse(localStorage.getItem(smartPinsStorageKey("org-a"))!)).toEqual([]);
    });

    it("lets a section bring its own pins, and shows a declared pin as locked", () => {
      const toggle = vi.fn();
      const own = createSmartSectionRegistry([
        actionSection("local.actions", ["Open"], {
          usePins: () => ({ isPinned: () => true, isLocked: () => true, toggle }),
        }),
      ]);
      render(<SmartContext registry={own} objects={objects} />);

      expect(within(pinnedGroup()).getByText("Open")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Open is always pinned" })).toBeDisabled();
      expect(localStorage.getItem(smartPinsStorageKey("org-a"))).toBeNull();
    });
  });
});
