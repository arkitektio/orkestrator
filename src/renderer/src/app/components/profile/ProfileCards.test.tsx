// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createProfileFromSession } from "@/core/lib/arkitekt/fakts/profileStorageSchema";

const state = {
  profiles: [] as unknown[],
  switchingProfileId: null as string | null,
  activeProfileId: null as string | null,
  connection: undefined as unknown,
  switchProfile: vi.fn(),
  connect: vi.fn(),
  signOutProfile: vi.fn(),
  removeProfile: vi.fn(),
};

vi.mock("@/core/lib/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/lib/arkitekt/host")>()),
  Arkitekt: {
    useProfiles: () => state.profiles,
    useSwitchingProfileId: () => state.switchingProfileId,
    useActiveProfileId: () => state.activeProfileId,
    useConnection: () => state.connection,
    useSwitchProfile: () => state.switchProfile,
    useConnect: () => state.connect,
    useSignOutProfile: () => state.signOutProfile,
    useRemoveProfile: () => state.removeProfile,
  },
}));

const { ProfileCards } = await import("./ProfileCards");

const ALIAS = { id: "a1", host: "localhost", ssl: false, challenge: "ht" };

const baseSession = {
  endpoint: {
    name: "Arkitekt Live",
    version: "0.1.0",
    base_url: "https://lok.test/lok/f/",
    frontend_url: "https://lok.test/",
    configure: "https://lok.test/configure/{code}",
    device_authorization_endpoint: "https://lok.test/lok/o/app-authorization/",
    token_endpoint: "https://lok.test/lok/o/token/",
  },
  fakts: {
    instances: { lok: { service: "live.arkitekt.lok", identifier: "3", aliases: [ALIAS] } },
    self: { deployment_name: "lok.test", alias: ALIAS },
    statuses: {},
  },
  token: {
    access_token: "at",
    token_type: "Bearer",
    refresh_token: "rt",
    client_id: "cid",
    received_at: 1,
  },
  aliasMap: { aliasMap: { lok: ALIAS } },
};

const makeProfile = (
  id: string,
  organizationName: string,
  status: "ok" | "stale" = "ok",
) => {
  const profile = createProfileFromSession(baseSession, 1, id);
  return {
    ...profile,
    status,
    label: { ...profile.label, organizationName },
  };
};

/** The card opens its choices rather than signing in on the click itself. */
const openCard = async (name: string) => {
  await userEvent.click(screen.getByRole("button", { name: new RegExp(name) }));
  await screen.findByRole("dialog");
};

describe("ProfileCards", () => {
  beforeEach(() => {
    state.profiles = [];
    state.switchingProfileId = null;
    state.activeProfileId = null;
    state.connection = undefined;
    state.switchProfile = vi.fn().mockResolvedValue(undefined);
    state.connect = vi.fn().mockResolvedValue(undefined);
    state.signOutProfile = vi.fn();
    state.removeProfile = vi.fn();
  });

  it("renders nothing when this computer holds no logins", () => {
    const { container } = render(<ProfileCards />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists the parked logins from their cached labels", () => {
    state.profiles = [makeProfile("id-a", "Alpha Lab"), makeProfile("id-b", "Beta Lab")];
    render(<ProfileCards />);

    expect(screen.getByText("Alpha Lab")).toBeTruthy();
    expect(screen.getByText("Beta Lab")).toBeTruthy();
  });

  it("switches into an ok profile without a fresh grant, remembered by default", async () => {
    state.profiles = [makeProfile("id-a", "Alpha Lab")];
    render(<ProfileCards />);

    await openCard("Alpha Lab");
    await userEvent.click(screen.getByRole("button", { name: "Switch to this account" }));

    await waitFor(() =>
      expect(state.switchProfile).toHaveBeenCalledWith("id-a", { remember: true }),
    );
    expect(state.connect).not.toHaveBeenCalled();
  });

  it("signs in for this run only when 'Stay signed in' is unticked", async () => {
    state.profiles = [makeProfile("id-a", "Alpha Lab")];
    render(<ProfileCards />);

    await openCard("Alpha Lab");
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "Switch to this account" }));

    await waitFor(() =>
      expect(state.switchProfile).toHaveBeenCalledWith("id-a", { remember: false }),
    );
  });

  it("sends a stale profile straight to a re-grant on its own deployment", async () => {
    state.profiles = [makeProfile("id-a", "Alpha Lab", "stale")];
    render(<ProfileCards />);

    await openCard("Alpha Lab");
    // Nothing to remember: the credential is gone, so the grant decides.
    expect(screen.queryByRole("checkbox")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Sign in again" }));

    await waitFor(() => expect(state.connect).toHaveBeenCalled());
    expect(state.connect.mock.calls[0][0].endpoint).toEqual(baseSession.endpoint);
    expect(state.switchProfile).not.toHaveBeenCalled();
  });

  it("keeps switching, signing out and removing clearly apart", async () => {
    state.profiles = [makeProfile("id-a", "Alpha Lab")];
    render(<ProfileCards />);

    await openCard("Alpha Lab");
    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(state.signOutProfile).toHaveBeenCalledWith("id-a");

    await openCard("Alpha Lab");
    await userEvent.click(screen.getByRole("button", { name: /remove from this computer/i }));
    expect(state.removeProfile).toHaveBeenCalledWith("id-a");
  });

  it("does not offer signing out an account that is already signed out", async () => {
    state.profiles = [makeProfile("id-a", "Alpha Lab", "stale")];
    render(<ProfileCards />);

    await openCard("Alpha Lab");
    expect(screen.queryByRole("button", { name: /sign out/i })).toBeNull();
    expect(screen.getByRole("button", { name: /remove from this computer/i })).toBeTruthy();
  });

  it("shows why a switch failed instead of leaving the screen silent", async () => {
    state.profiles = [makeProfile("id-a", "Alpha Lab")];
    state.switchProfile = vi.fn().mockRejectedValue(new Error("nope"));
    render(<ProfileCards />);

    await openCard("Alpha Lab");
    await userEvent.click(screen.getByRole("button", { name: "Switch to this account" }));

    await waitFor(() => expect(screen.getByText(/nope/i)).toBeTruthy());
  });
});
