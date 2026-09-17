// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** Alpaka on or off — the chip must follow the guard, never the code. */
let alpakaReady = true;
vi.mock("@/app/Arkitekt", () => ({
  Guard: {
    Alpaka: ({ children, unavailable }: { children: React.ReactNode; unavailable: React.ReactNode }) =>
      alpakaReady ? <>{children}</> : <>{unavailable}</>,
  },
}));

const modifiers = { shiftKey: false, altKey: false, metaKey: false };
vi.mock("@/app/hooks/modifierTracker", () => ({ useModifierState: () => modifiers }));

const openTarget = vi.fn();
vi.mock("../../useOpenTarget", () => ({ useOpenTarget: () => openTarget }));

const activateModifier = vi.fn();
let query = "";
vi.mock("../../CommandPaletteProvider", () => ({
  useCommandPalette: () => ({ activateModifier, query }),
}));

vi.mock("@/providers/smart/registry", () => ({
  smartRegistry: { getDisplayName: (i: string) => i },
}));

const createRoom = vi.fn(async () => ({ data: { createRoom: { id: "room-9" } } }));
vi.mock("@/alpaka/api/graphql", () => ({ useCreateRoomMutation: () => [createRoom] }));
vi.mock("@/linkers", () => ({ AlpakaRoom: { linkBuilder: (id: string) => `/alpaka/rooms/${id}` } }));
const navigate = vi.fn();
vi.mock("react-router-dom", async (orig) => ({
  ...(await orig<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

import { Command, CommandList } from "@/components/ui/command";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EntityRow } from "./EntityRow";

const renderRow = () =>
  render(
    <TooltipProvider>
      <Command>
        <CommandList>
          <EntityRow identifier="@mikro/arraydataset" id="5" label="HeLa s3" />
        </CommandList>
      </Command>
    </TooltipProvider>,
  );

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

beforeEach(() => {
  // cmdk scrolls the selected item into view; jsdom has no layout.
  Element.prototype.scrollIntoView ??= () => {};
  alpakaReady = true;
  modifiers.shiftKey = false;
  modifiers.altKey = false;
  query = "";
  localStorage.clear();
  vi.clearAllMocks();
});

describe("talking about a search hit", () => {
  it("offers a Talk chip that opens a room about the hit, prefilled with what was typed", async () => {
    query = "what is hela s3 about";
    renderRow();
    act(() => screen.getByLabelText("Talk about HeLa s3").click());
    await flush();

    expect(createRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          input: expect.objectContaining({
            title: "Talk about HeLa s3",
            talkingAbout: [{ identifier: "@mikro/arraydataset", object: 5 }],
          }),
        },
      }),
    );
    expect(navigate).toHaveBeenCalledWith(
      expect.stringContaining(`/alpaka/rooms/room-9?prefillStructures=`),
    );
    expect(navigate.mock.calls[0][0]).toContain(`text=${encodeURIComponent("what is hela s3 about")}`);
    expect(openTarget).not.toHaveBeenCalled(); // the chip does not also open the page
  });

  it("does the same on ⌥+Enter, the keyboard's way to the chip", async () => {
    modifiers.altKey = true;
    renderRow();
    act(() => screen.getByText("HeLa s3").closest("[cmdk-item]")!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await flush();
    expect(createRoom).toHaveBeenCalledTimes(1);
    expect(openTarget).not.toHaveBeenCalled();
  });

  it("has no chip without Alpaka — the mutation must never mount", () => {
    alpakaReady = false;
    renderRow();
    expect(screen.queryByLabelText("Talk about HeLa s3")).toBeNull();
    expect(screen.getByText("HeLa s3")).toBeInTheDocument();
  });

  it("still navigates on a plain select", () => {
    renderRow();
    act(() => screen.getByText("HeLa s3").closest("[cmdk-item]")!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(openTarget).toHaveBeenCalledWith({ kind: "entity", identifier: "@mikro/arraydataset", id: "5", label: "HeLa s3" });
    expect(createRoom).not.toHaveBeenCalled();
  });
});
