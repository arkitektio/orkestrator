// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const openCall = vi.hoisted(() => vi.fn());
vi.mock("./useOpenCall", () => ({ useOpenCall: () => openCall }));
vi.mock("@/core/smart/display/StructureDisplay", () => ({
  StructureDisplay: ({ identifier, id }: { identifier: string; id: string }) => <span>{`${identifier}:${id}`}</span>,
}));
vi.mock("@/core/ui/tooltip-button", () => ({
  TooltipButton: ({ tooltip: _tooltip, children, ...props }: { tooltip: string; children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

import type { ListCallFragment } from "@/lovekit/api/graphql";

import { CallAnnouncementIsland } from "./CallAnnouncementIsland";
import { callAnnouncementStore } from "./announcements";
import { callStore } from "./store";

const call = (id: string): ListCallFragment => ({
  id,
  title: `Call ${id}`,
  roomName: `call-${id}`,
  createdAt: "2026-10-09T12:00:00Z",
  creator: { id: "7", sub: "7", preferredUsername: "ada" },
  about: [{ identifier: "@mikro/image", object: 42 }],
  participantCount: 2,
});

beforeEach(() => {
  callAnnouncementStore.getState().clear();
  callStore.getState().leave();
  openCall.mockClear();
});
afterEach(cleanup);

describe("CallAnnouncementIsland", () => {
  it("shows nothing while no call was announced", () => {
    render(<CallAnnouncementIsland />);
    expect(screen.queryByTestId("call-announcement-island")).toBeNull();
  });

  it("offers an announced call: who started it, what about, and a way in", () => {
    render(<CallAnnouncementIsland />);
    act(() => callAnnouncementStore.getState().announce(call("1")));

    const row = screen.getByTestId("call-announcement");
    expect(row.textContent).toContain("Call 1");
    expect(row.textContent).toContain("@lok/user:7 started a call about @mikro/image:42");

    fireEvent.click(screen.getByText("Join"));
    expect(openCall).toHaveBeenCalledWith(expect.objectContaining({ id: "1" }), { join: true });

    fireEvent.click(screen.getByLabelText("Join the call to the side"));
    expect(openCall).toHaveBeenLastCalledWith(expect.objectContaining({ id: "1" }), { join: true, target: "side" });
  });

  it("puts a call away on Dismiss", () => {
    render(<CallAnnouncementIsland />);
    act(() => callAnnouncementStore.getState().announce(call("1")));
    fireEvent.click(screen.getByText("Dismiss"));
    expect(callAnnouncementStore.getState().calls).toEqual([]);
  });

  it("does not offer the call this window is in", () => {
    render(<CallAnnouncementIsland />);
    act(() => {
      callAnnouncementStore.getState().announce(call("1"));
      callAnnouncementStore.getState().announce(call("2"));
      callStore.getState().start({ id: "1", title: "Call 1" }, "token");
    });
    expect(screen.getAllByTestId("call-announcement").map((row) => row.textContent)).toEqual([
      expect.stringContaining("Call 2"),
    ]);
  });
});
