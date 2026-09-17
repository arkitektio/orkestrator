// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** Alpaka on or off — the row must follow the guard, never the code. */
let alpakaReady = true;
vi.mock("@/app/Arkitekt", () => ({
  Guard: {
    Alpaka: ({ children }: { children: React.ReactNode }) =>
      alpakaReady ? <>{children}</> : null,
  },
}));

let query = "";
vi.mock("../CommandPaletteProvider", () => ({
  useCommandPalette: () => ({ query }),
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
import type { Structure } from "@/types";
import { ApplicableAsk } from "./ApplicableAsk";

const onDone = vi.fn();

const renderAsk = (objects: Structure[] = []) =>
  render(
    <TooltipProvider>
      <Command shouldFilter={false}>
        <CommandList>
          <ApplicableAsk filter={query} objects={objects} onDone={onDone} />
        </CommandList>
      </Command>
    </TooltipProvider>,
  );

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

const navigatedTo = () => new URL(navigate.mock.calls[0][0] as string, "http://app");

beforeEach(() => {
  // cmdk scrolls the selected item into view; jsdom has no layout.
  Element.prototype.scrollIntoView ??= () => {};
  alpakaReady = true;
  query = "";
  localStorage.clear();
  vi.clearAllMocks();
});

describe("asking an agent from the palette", () => {
  it("is there for a query that matches nothing, and opens a room holding it", async () => {
    query = "whats that?";
    renderAsk();

    act(() => screen.getByText("Ask an agent").click());
    await flush();

    expect(createRoom).toHaveBeenCalledWith({
      variables: { input: { title: "whats that?", description: undefined, talkingAbout: undefined } },
    });
    expect(navigatedTo().pathname).toBe("/alpaka/rooms/room-9");
    expect(navigatedTo().searchParams.get("text")).toBe("whats that?");
    expect(navigatedTo().searchParams.has("prefillStructures")).toBe(false);
    expect(onDone).toHaveBeenCalled();
  });

  it("attaches what is in context to the question", async () => {
    query = "whats that?";
    renderAsk([{ identifier: "@mikro/image", object: { id: "42" } }]);

    act(() => screen.getByText("Ask an agent").click());
    await flush();

    const about = [{ identifier: "@mikro/image", object: 42 }];
    expect(createRoom).toHaveBeenCalledWith({
      variables: {
        input: expect.objectContaining({ title: "whats that?", talkingAbout: about }),
      },
    });
    expect(JSON.parse(navigatedTo().searchParams.get("prefillStructures")!)).toEqual(about);
    expect(navigatedTo().searchParams.get("text")).toBe("whats that?");
  });

  it("is not offered with nothing typed", () => {
    renderAsk();
    expect(screen.queryByText("Ask an agent")).toBeNull();
  });

  it("is not offered without alpaka", () => {
    alpakaReady = false;
    query = "whats that?";
    renderAsk();
    expect(screen.queryByText("Ask an agent")).toBeNull();
  });
});
