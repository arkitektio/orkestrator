// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

/** Modules as the runtime reports them: two up, one down. */
const modules = [
  { key: "mikro", status: "ready", route: "/mikro", definition: { key: "mikro", label: "Mikro" } },
  { key: "rekuest", status: "checking", route: "/rekuest", definition: { key: "rekuest", label: "Rekuest" } },
  { key: "kraph", status: "invalid", route: "/kraph", definition: { key: "kraph", label: "Kraph" } },
];
vi.mock("@/core/lib/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/lib/arkitekt/host")>()),
  Arkitekt: { useAvailableModules: () => modules },
  moduleRegistry: { mikro: { label: "Mikro" }, rekuest: { label: "Rekuest" }, kraph: { label: "Kraph" } },
}));
vi.mock("@/core/modules/moduleIcons", () => ({ matchIcon: (k: string) => <i>{k}</i> }));
vi.mock("@uidotdev/usehooks", () => ({ useDebounce: (v: unknown) => v }));

const title = vi.fn();
vi.mock("@/core/command/tabs/useTabTitle", () => ({ useTabTitle: (t: string) => title(t) }));

// The palette's sources, reduced to what they were handed.
vi.mock("@/core/command/sources/ApplicableRecents", () => ({
  ApplicableRecents: ({ filter }: { filter: string }) => <div data-testid="recents">{filter}</div>,
}));
vi.mock("@/core/command/sources/ApplicableNavigation", () => ({
  ApplicableNavigation: ({ filter }: { filter: string }) => <div data-testid="navigation">{filter}</div>,
}));
vi.mock("@/core/command/sources/entity/ApplicableEntitySearch", () => ({
  ApplicableEntitySearch: ({ filter }: { filter: string }) => <div data-testid="entities">{filter}</div>,
}));

import { NewTabPage } from "./NewTabPage";

beforeEach(() => {
  Element.prototype.scrollIntoView ??= () => {};
  title.mockClear();
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/new"]}>
      <NewTabPage />
    </MemoryRouter>,
  );

describe("the new-tab page", () => {
  it("is the search, focused and ready to type into", () => {
    renderPage();
    const input = screen.getByPlaceholderText("Search, ask or do…");
    expect(document.activeElement).toBe(input);
  });

  it("names its tab", () => {
    renderPage();
    expect(title).toHaveBeenCalledWith("New tab");
  });

  it("hands what is typed to the same sources the palette uses", () => {
    renderPage();
    const input = screen.getByPlaceholderText("Search, ask or do…") as HTMLInputElement;
    act(() => {
      // cmdk's input is controlled through the native setter + input event.
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "hela");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(screen.getByTestId("recents").textContent).toBe("hela");
    expect(screen.getByTestId("navigation").textContent).toBe("hela");
    expect(screen.getByTestId("entities").textContent).toBe("hela");
  });

  it("shows a tile per module that is up, linking into it", () => {
    renderPage();
    const tiles = screen.getByLabelText("Modules");
    expect(tiles.querySelector('a[href="/mikro"]')?.textContent).toContain("Mikro");
    expect(tiles.querySelector('a[href="/rekuest"]')).not.toBeNull(); // still checking: shown
    expect(tiles.querySelector('a[href="/kraph"]')).toBeNull(); // down: not offered
  });
});
