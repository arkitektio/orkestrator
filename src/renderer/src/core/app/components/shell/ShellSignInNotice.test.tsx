// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createProfileFromSession } from "@/core/lib/arkitekt/fakts/profileStorageSchema";

const state = {
  autoLoginError: undefined as string | undefined,
  connection: undefined as unknown,
  profile: null as unknown,
  connect: vi.fn(),
  signOutProfile: vi.fn(),
};

vi.mock("@/core/lib/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/lib/arkitekt/host")>()),
  Arkitekt: {
    useAutoLoginError: () => state.autoLoginError,
    useConnection: () => state.connection,
    useActiveProfile: () => state.profile,
    useConnect: () => state.connect,
    useSignOutProfile: () => state.signOutProfile,
  },
}));

const { ShellSignInNotice } = await import("./ShellSignInNotice");

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
  status: "ok" | "stale" = "stale",
  identity: { userId?: string; hubId?: string } = {},
) => {
  const profile = createProfileFromSession(baseSession, 1, "id-a");
  return {
    ...profile,
    status,
    statusMessage: status === "stale" ? "Session expired — sign in again" : undefined,
    label: { ...profile.label, organizationName: "Alpha Lab" },
    identity: { ...profile.identity, ...identity },
  };
};

beforeEach(() => {
  state.autoLoginError = "Session expired";
  state.connection = undefined;
  state.profile = makeProfile();
  state.connect = vi.fn().mockResolvedValue(undefined);
  state.signOutProfile = vi.fn();
});

describe("ShellSignInNotice", () => {
  it("renders nothing on the happy path", () => {
    state.autoLoginError = undefined;
    const { container } = render(<ShellSignInNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing once a connection exists", () => {
    state.connection = { selfService: {} };
    const { container } = render(<ShellSignInNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names the organization whose session expired", () => {
    render(<ShellSignInNotice />);
    expect(screen.getByText(/Your session for Alpha Lab expired/)).toBeTruthy();
  });

  it("says the deployment was unreachable when the credential was never refused", () => {
    // Only an answer from the token endpoint marks a profile stale; a network
    // blip must not tell the user they are signed out.
    state.profile = makeProfile("ok");
    state.autoLoginError = "fetch failed";
    render(<ShellSignInNotice />);
    expect(screen.getByText(/Couldn't reach lok.test/)).toBeTruthy();
  });

  it("grants inline against the profile's own deployment", async () => {
    // No dialog: the dialog provider renders inside Guard.Rekuest and there is
    // no rekuest here.
    render(<ShellSignInNotice />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in again" }));

    await waitFor(() => expect(state.connect).toHaveBeenCalled());
    expect(state.connect.mock.calls[0][0].endpoint).toEqual(baseSession.endpoint);
  });

  it("tells the configure page which account expired", async () => {
    // Otherwise the user lands in a browser holding several accounts with no
    // indication of which one to pick, and a wrong pick mints a second profile
    // for the same person.
    state.profile = makeProfile("stale", { userId: "u1", hubId: "h1" });
    render(<ShellSignInNotice />);

    await userEvent.click(screen.getByRole("button", { name: "Sign in again" }));

    await waitFor(() =>
      expect(state.connect.mock.calls[0][0].hint).toEqual({ sub: "u1", hub: "h1" }),
    );
  });

  it("parks the profile to get back to the account list", async () => {
    render(<ShellSignInNotice />);
    await userEvent.click(screen.getByRole("button", { name: /choose another account/i }));
    expect(state.signOutProfile).toHaveBeenCalledWith("id-a");
  });
});
