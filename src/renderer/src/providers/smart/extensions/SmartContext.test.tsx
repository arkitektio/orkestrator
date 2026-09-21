// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommandItem } from "@/components/ui/command";

vi.mock("@/app/smartcontext", () => ({ SMART_SECTIONS: { sections: [] } }));
vi.mock("@/hooks/use-debounce", () => ({ useDebounce: <T,>(value: T) => value }));
vi.mock("./rekuest/RunOnSubmenu", () => ({
  RunOnSubmenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { SmartContext } from "./context";
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

const objects = [{ identifier: "@mikro/image", object: { id: "1" } }];

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
});
