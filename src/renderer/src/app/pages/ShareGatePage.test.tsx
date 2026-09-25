// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const { profilesRef, activeRef, switchProfile, connect, discover, navigated } = vi.hoisted(
  () => ({
    profilesRef: { current: [] as unknown[] },
    activeRef: { current: null as unknown },
    switchProfile: vi.fn(),
    connect: vi.fn(),
    discover: vi.fn(),
    navigated: { current: [] as string[] },
  }),
);

vi.mock("@/core/lib/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/lib/arkitekt/host")>()),
  Arkitekt: {
    useProfiles: () => profilesRef.current,
    useActiveProfile: () => activeRef.current,
    useSwitchProfile: () => switchProfile,
    useConnect: () => connect,
  },
}));
vi.mock("@/core/lib/arkitekt/fakts/discover", () => ({ discover }));

import { ShareGatePage } from "./ShareGatePage";

const profile = (over: Record<string, unknown> = {}) => ({
  id: "p1",
  identity: {
    baseUrl: "https://go.arkitekt.live",
    userId: "u1",
    organizationId: "acme",
    ...(over.identity as object),
  },
  label: { organizationName: "Acme", deploymentName: "go.arkitekt.live" },
});

/** Renders the gate and records where it sends us. */
const Landing = () => {
  const { pathname, search } = window.location;
  return <div data-testid="landed">{`${pathname}${search}`}</div>;
};

const renderGate = async (search: string) => {
  navigated.current = [];
  const view = render(
    <MemoryRouter initialEntries={[`/open${search}`]}>
      <Routes>
        <Route path="/open" element={<ShareGatePage />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </MemoryRouter>,
  );
  // let the async digest/profile lookups settle
  await act(async () => {});
  return view;
};

const SCOPED = "?to=https%3A%2F%2Fgo.arkitekt.live&org=acme&path=%2Fmikro%2Fimages%2F5";

describe("ShareGatePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    profilesRef.current = [];
    activeRef.current = null;
    discover.mockResolvedValue({ name: "other", base_url: "https://other.example.org" });
    connect.mockResolvedValue(undefined);
  });

  it("lands silently when the link's scope is the one we are on", async () => {
    activeRef.current = profile();
    await renderGate(SCOPED);
    expect(screen.getByTestId("landed")).toBeTruthy();
    expect(switchProfile).not.toHaveBeenCalled();
  });

  it("asks before switching, and does not switch on its own", async () => {
    activeRef.current = profile({ identity: { organizationId: "other" } });
    profilesRef.current = [profile()];
    await renderGate(SCOPED);

    expect(screen.getByText(/Open in Acme/i)).toBeTruthy();
    // The whole point of "always confirm": nothing has moved yet.
    expect(switchProfile).not.toHaveBeenCalled();
  });

  it("switches only once the user confirms, remembering where to land", async () => {
    activeRef.current = profile({ identity: { organizationId: "other" } });
    profilesRef.current = [profile()];
    await renderGate(SCOPED);

    await act(async () => {
      screen.getByRole("button", { name: /switch and open/i }).click();
    });

    expect(switchProfile).toHaveBeenCalledWith("p1");
    // The switch destroys this tab, so the destination is recorded, not navigated to.
    expect(window.sessionStorage.getItem("arkitektPendingShare")).toBe("/mikro/images/5");
  });

  it("offers to connect when a readable link names a deployment we do not have", async () => {
    activeRef.current = profile({ identity: { organizationId: "other" } });
    profilesRef.current = [];
    await renderGate(
      "?to=https%3A%2F%2Fother.example.org&org=acme&path=%2Fmikro%2Fimages%2F5",
    );

    expect(screen.getByText(/not connected to this workspace/i)).toBeTruthy();
    await act(async () => {
      screen.getByRole("button", { name: /connect/i }).click();
    });

    // The grant runs HERE — no dialog reimplementing the sign-in screen, and
    // no dialog at all: the provider that renders them sits inside
    // `Guard.Rekuest`, which is precisely what this branch does not have.
    expect(discover).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://other.example.org" }),
    );
    expect(connect).toHaveBeenCalled();
    expect(connect.mock.calls[0][0].hint).toBeUndefined();
    // Where to land is recorded before the switch destroys this tab.
    expect(window.sessionStorage.getItem("arkitektPendingShare")).toBe(
      "/mikro/images/5",
    );
  });

  it("asks before switching hubs within one organization", async () => {
    // Same server, same org, different hub: two separate approvals with two
    // separate refresh chains, so this is a real switch and not a no-op.
    activeRef.current = profile({ identity: { hubId: "hub-2" } });
    profilesRef.current = [profile({ identity: { hubId: "hub-1" } })];
    await renderGate(`${SCOPED}&hub=hub-1`);

    expect(screen.getByText(/Open in Acme/i)).toBeTruthy();
    expect(switchProfile).not.toHaveBeenCalled();
  });

  it("lands silently on a link whose hub predates the field", async () => {
    // An older link names no hub; the profile does. That is "cannot tell",
    // not a mismatch, so it must not prompt.
    activeRef.current = profile({ identity: { hubId: "hub-1" } });
    await renderGate(SCOPED);
    expect(screen.getByTestId("landed")).toBeTruthy();
  });

  it("tells the configure page which hub to preselect, but never which user", async () => {
    activeRef.current = profile({ identity: { organizationId: "other" } });
    profilesRef.current = [];
    await renderGate(
      "?to=https%3A%2F%2Fother.example.org&org=acme&hub=hub-9&path=%2Fmikro%2Fimages%2F5",
    );
    await act(async () => {
      screen.getByRole("button", { name: /connect/i }).click();
    });
    // A colleague opening this link is a different account on the same
    // deployment, so `sub` would be actively wrong.
    expect(connect.mock.calls[0][0].hint).toEqual({ hub: "hub-9" });
  });

  it("refuses an opaque link with no matching profile, and offers nothing to connect to", async () => {
    activeRef.current = profile({ identity: { organizationId: "other" } });
    profilesRef.current = [];
    await renderGate("?s=deadbeef&path=%2Fmikro%2Fimages%2F5");

    expect(screen.getByText(/do not have access/i)).toBeTruthy();
    // A digest cannot be turned back into an invitation.
    expect(screen.queryByRole("button", { name: /connect/i })).toBeNull();
  });

  it("says so when the link carries no page to open", async () => {
    await renderGate("?to=https%3A%2F%2Fgo.arkitekt.live");
    expect(screen.getByText(/incomplete/i)).toBeTruthy();
  });
});
