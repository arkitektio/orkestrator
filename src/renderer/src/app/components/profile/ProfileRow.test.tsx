// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DropdownMenu, DropdownMenuContent } from "@/core/ui/dropdown-menu";
import { createProfileFromSession } from "@/core/connection/arkitekt/fakts/profileStorageSchema";
import ProfileRow from "./ProfileRow";
import { profileInitials } from "../../../core/connection/profile/ui/ProfileBrandAvatar";

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

const makeProfile = (label: Record<string, unknown> = {}, status: "ok" | "stale" = "ok") => {
  const profile = createProfileFromSession(baseSession, 1, "id-a");
  return { ...profile, status, label: { ...profile.label, ...label } };
};

const renderRow = (profile: ReturnType<typeof makeProfile>, overrides = {}) =>
  render(
    <DropdownMenu open>
      <DropdownMenuContent>
        <ProfileRow
          profile={profile as never}
          active={false}
          switching={false}
          onSelect={vi.fn()}
          onSignOut={vi.fn()}
          onRemove={vi.fn()}
          {...overrides}
        />
      </DropdownMenuContent>
    </DropdownMenu>,
  );

describe("ProfileRow", () => {
  it("shows the hub first and the organization under it, muted", () => {
    // Which hub is the choice being made; the organization is the context it
    // sits in. Two rows of one organization are otherwise identical.
    renderRow(
      makeProfile({
        hubName: "Imaging",
        organizationName: "Alpha Lab",
        username: "jhnnsrs",
        deploymentName: "lok.test",
      }),
    );

    expect(screen.getByText("Imaging")).toBeTruthy();
    const detail = screen.getByText(/^Alpha Lab · jhnnsrs/);
    expect(detail.className).toContain("text-muted-foreground");
  });

  it("separates signing out from removing, and says what each costs", async () => {
    // Picking the row switches and spends nothing. These two do spend
    // something, and the difference is invisible in the moment.
    const onSignOut = vi.fn();
    const onRemove = vi.fn();
    const profile = makeProfile({ organizationName: "Alpha Lab" });
    renderRow(profile, { onSignOut, onRemove });

    await userEvent.click(screen.getByLabelText("More for Alpha Lab"));

    expect(await screen.findByText("Sign out")).toBeTruthy();
    expect(
      screen.getByText(/Signing back in needs your browser/),
    ).toBeTruthy();
    expect(screen.getByText("Remove from this computer")).toBeTruthy();
    expect(screen.getByText(/stays valid on the server/)).toBeTruthy();
  }, 20000);

  it("renders a parked profile from its cached label alone", () => {
    // No connection, no lok query — this is the whole reason labels are cached.
    renderRow(makeProfile({ organizationName: "Acme Labs", username: "jhnnsrs" }));

    expect(screen.getByText("Acme Labs")).toBeInTheDocument();
    expect(screen.getByText(/jhnnsrs/)).toBeInTheDocument();
  });

  it("falls back to the deployment name when lok has never answered", () => {
    // A freshly granted profile has no organization yet — it must still draw.
    renderRow(makeProfile());
    expect(screen.getAllByText("lok.test").length).toBeGreaterThan(0);
  });

  it("offers a sign-in prompt instead of a switch when the session is stale", () => {
    renderRow(makeProfile({ organizationName: "Acme Labs" }, "stale"));
    expect(screen.getByText(/Session expired/)).toBeInTheDocument();
  });
});

describe("profileInitials", () => {
  it("prefers the organization and takes one letter from each word", () => {
    expect(profileInitials(makeProfile({ organizationName: "Acme Labs" }) as never)).toBe("AL");
  });

  it("falls back to the deployment when there is no organization yet", () => {
    expect(profileInitials(makeProfile() as never)).toBe("LT");
  });
});
