// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/util/hooks/use-debounce", () => ({ useDebounce: <T,>(value: T) => value }));

vi.mock("@/core/connection/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/connection/arkitekt/host")>()),
  Arkitekt: { useActiveProfileId: () => "org-a" },
}));

import { CommandActionRow } from "./CommandActionRow";
import { SmartMenu, useSmartMenu } from "./menu";
import type { SmartContextSection } from "./section";
import { createSmartSectionRegistry, type SmartSectionRegistry } from "./sectionRegistry";
import { SmartRowItem, type SkinRowProps, type SmartMenuSkin } from "./skin";
import { TILE_SKIN } from "./skins/tiles";
import { SmartContext } from "./context";
import type { SmartContextProps } from "./types";

const ran = vi.fn();

type Item = { key: string; failed?: boolean; offline?: boolean };

const section = (rows: Item[]): SmartContextSection<Item> => ({
  id: "local.actions",
  module: "local",
  title: "Things",
  priority: 0,
  tier: "instant",
  applies: () => true,
  useItems: () => ({ items: rows, status: "ready" }),
  itemKey: (item) => item.key,
  Row: ({ item }) => (
    <CommandActionRow
      value={item.key}
      title={`Do ${item.key}`}
      description={`Does ${item.key}`}
      running={item.key === "b"}
      failure={item.failed ? { title: "Failed", detail: "it broke" } : null}
      unavailable={item.offline ? { reason: "Nobody is online" } : null}
      onSelect={() => ran(item.key)}
      trailing={<span>list-only</span>}
    />
  ),
});

/** A skin of the test's own: what it is handed, as text. */
const seen: SkinRowProps[] = [];
const PROBE_SKIN: SmartMenuSkin = {
  Row: (props) => {
    seen.push(props);
    return (
      <SmartRowItem value={props.value} onSelect={props.onSelect}>
        <span data-testid="probe-row">{props.title}</span>
      </SmartRowItem>
    );
  },
  Group: ({ heading, children }) => (
    <div data-testid="probe-group" data-heading={String(heading)}>
      {children}
    </div>
  ),
  listClassName: "probe-list",
};

const Menu = ({
  skin,
  ...props
}: SmartContextProps & { skin: SmartMenuSkin; registry: SmartSectionRegistry }) => {
  const menu = useSmartMenu(props);
  return (
    <SmartMenu.Root menu={menu} skin={skin}>
      <SmartMenu.Body>
        <SmartMenu.Search />
        <SmartMenu.List>
          <SmartMenu.Pinned />
          <SmartMenu.Sections />
          <SmartMenu.Empty />
        </SmartMenu.List>
      </SmartMenu.Body>
    </SmartMenu.Root>
  );
};

const objects = [{ identifier: "@mikro/image", id: "1" }];
const registryOf = (rows: Parameters<typeof section>[0]) =>
  createSmartSectionRegistry([section(rows)]);

beforeEach(() => {
  ran.mockReset();
  seen.length = 0;
  localStorage.clear();
});
afterEach(cleanup);

describe("smart menu skins", () => {
  it("a skin draws every row and group the sections give it, with the row's props and pin", () => {
    render(<Menu skin={PROBE_SKIN} registry={registryOf([{ key: "a" }, { key: "b" }])} objects={objects} />);

    expect(screen.getAllByTestId("probe-row").map((node) => node.textContent)).toEqual(["Do a", "Do b"]);
    expect(screen.getByTestId("probe-group").dataset.heading).toBe("Things");
    expect(seen.find((props) => props.value === "b")?.running).toBe(true);
    expect(seen[0].pin).toMatchObject({ pinned: false, locked: false });
    expect(document.querySelector(".probe-list")).not.toBeNull();
  });

  it("the first skinned row is selected and Enter runs it", () => {
    render(<Menu skin={PROBE_SKIN} registry={registryOf([{ key: "a" }, { key: "b" }])} objects={objects} />);
    const search = screen.getByPlaceholderText("Search");

    expect(document.querySelector('[cmdk-item][data-selected="true"]')?.textContent).toBe("Do a");
    act(() => {
      fireEvent.keyDown(search, { key: "Enter" });
    });
    expect(ran).toHaveBeenCalledWith("a");
  });

  it("without a skin, the menu is the list it always was", () => {
    render(<SmartContext registry={registryOf([{ key: "a", failed: true }])} objects={objects} />);

    expect(screen.getByText("Do a")).toBeTruthy();
    expect(screen.getByText("list-only")).toBeTruthy();
    expect(screen.getByText("it broke")).toBeTruthy();
    expect(screen.getByText("Things")).toBeTruthy();
  });

  it("tiles: no headings, the list's slots dropped, a failure marked on the tile", () => {
    render(
      <Menu skin={TILE_SKIN} registry={registryOf([{ key: "a", failed: true }, { key: "b" }])} objects={objects} />,
    );

    expect(screen.getByText("Do a")).toBeTruthy();
    expect(screen.queryByText("Things")).toBeNull();
    expect(screen.queryByText("list-only")).toBeNull();
    const tiles = Array.from(document.querySelectorAll("[cmdk-item]"));
    expect(tiles).toHaveLength(2);
    expect(tiles[0].className).toContain("ring-destructive");
    expect(tiles[1].className).toContain("animate-pulse");
  });

  it("a row that cannot run now recedes and says why, and Enter still runs it", () => {
    render(<SmartContext registry={registryOf([{ key: "a", offline: true }, { key: "c" }])} objects={objects} />);

    const [offline, online] = Array.from(document.querySelectorAll<HTMLElement>("[cmdk-item]"));
    expect(offline.dataset.unavailable).toBe("true");
    expect(offline.className).toContain("opacity-60");
    expect(offline.textContent).toContain("offline");
    expect(offline.textContent).toContain("Does a · Nobody is online");
    expect(online.dataset.unavailable).toBeUndefined();

    act(() => {
      fireEvent.keyDown(screen.getByPlaceholderText("Search"), { key: "Enter" });
    });
    expect(ran).toHaveBeenCalledWith("a");
    cleanup();

    render(<Menu skin={TILE_SKIN} registry={registryOf([{ key: "a", offline: true }])} objects={objects} />);
    const tile = document.querySelector<HTMLElement>("[cmdk-item]")!;
    expect(tile.dataset.unavailable).toBe("true");
    expect(tile.className).toContain("opacity-50");
  });
});
