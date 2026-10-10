// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const profile = (id: string, slug: string | undefined, hub: string | null = "3") => ({
  id,
  identity: { baseUrl: "https://go.arkitekt.live/lok", hubId: hub },
  label: { organizationSlug: slug, organizationName: slug && `${slug} org` },
  session: { endpoint: { base_url: "https://go.arkitekt.live/lok" } },
});

const host = vi.hoisted(() => ({
  active: null as unknown,
  profiles: [] as unknown[],
  connect: vi.fn(async () => undefined),
  switchTo: vi.fn(),
}));

vi.mock("@/core/connection/arkitekt/host", () => ({
  Arkitekt: {
    useActiveProfile: () => host.active,
    useProfiles: () => host.profiles,
    useConnect: () => host.connect,
  },
}));
vi.mock("@/core/connection/profile/ui/useSwitchToProfile", () => ({ useSwitchToProfile: () => host.switchTo }));
vi.mock("@/core/modules/host/host", () => ({ useModuleHostVersion: () => 0 }));
vi.mock("@/core/layout/fallbacks/statusActions", () => ({ BackButton: () => null, HomeButton: () => null }));
vi.mock("@/core/smart/tabTargets", () => ({
  structureTabTarget: ({ identifier, id }: { identifier: string; id: string }) =>
    identifier === "@mikro/image" ? { to: `/mikro/images/${id}`, label: "Image" } : null,
}));

import { consumePendingShare } from "@/core/tabs/pendingShare";
import { SmartLinkPage } from "./SmartLinkPage";

const Where = () => {
  const { pathname, search } = useLocation();
  return <span data-testid="where">{pathname + search}</span>;
};

const open = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="smart/*" element={<SmartLinkPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

const LINK = "/smart/my-lab/3/%40mikro%2Fimage/42";

describe("SmartLinkPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    host.active = profile("p-1", "my-lab");
    host.profiles = [host.active];
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("opens the object's page on the login the link belongs to, query kept but for the sharer", async () => {
    open(`${LINK}?tab=info&user_id=7`);
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/mikro/images/42?tab=info"));
  });

  it("reads an identifier written with literal slashes too", async () => {
    open("/smart/my-lab/3/@mikro/image/42");
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/mikro/images/42"));
  });

  it("asks before switching to the login it belongs to, and comes back to the link there", () => {
    const other = profile("p-2", "other-lab");
    host.active = other;
    host.profiles = [other, profile("p-1", "my-lab")];
    open(LINK);
    expect(screen.getByText("Open in my-lab org?")).toBeTruthy();
    expect(host.switchTo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Switch and open"));
    expect(host.switchTo).toHaveBeenCalledWith(expect.objectContaining({ id: "p-1" }));
    expect(consumePendingShare()).toBe(LINK);
  });

  it("does not take a login of the same organization on another hub", () => {
    host.active = profile("p-1", "my-lab", "9");
    host.profiles = [host.active];
    open(LINK);
    expect(screen.getByText("You have no login for my-lab on this device")).toBeTruthy();
  });

  it("offers to sign in when no login matches, pointing at the link's hub", async () => {
    host.active = profile("p-2", "other-lab");
    host.profiles = [host.active];
    open(LINK);
    fireEvent.click(screen.getByText("Sign in…"));
    await waitFor(() => expect(host.connect).toHaveBeenCalledWith(expect.objectContaining({ hint: { hub: "3" } })));
    expect(consumePendingShare()).toBe(LINK);
  });

  it("waits while the login has not heard its organization's slug", () => {
    host.active = profile("p-1", undefined);
    host.profiles = [host.active];
    open(LINK);
    expect(screen.getByText("Checking this link…")).toBeTruthy();
  });

  it("says so when nothing has a page for the identifier, or the link is malformed", () => {
    open("/smart/my-lab/3/%40nope%2Fthing/1");
    expect(screen.getByText("Nothing here can open this")).toBeTruthy();
    cleanup();
    open("/smart/my-lab/3");
    expect(screen.getByText("This link cannot be read")).toBeTruthy();
  });
});
