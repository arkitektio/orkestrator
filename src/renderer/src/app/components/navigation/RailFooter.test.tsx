// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const activeProfile = vi.fn();
const autoLoggingIn = vi.fn(() => false);
const parkSession = vi.fn();

vi.mock("@/app/Arkitekt", () => ({
  Arkitekt: {
    useActiveProfile: () => activeProfile(),
    useIsAutoLoggingIn: () => autoLoggingIn(),
    useDisconnect: () => parkSession,
  },
}));

import { openRailSwitcher } from "./railSwitcher";

vi.mock("@/app/components/profile/ProfileSwitcher", () => ({
  default: () => <div>switcher</div>,
}));

// `DroppableNavLink` navigates, so it needs a router; this test is about the
// footer, not navigation or drag-and-drop.
vi.mock("@/components/ui/link", () => ({
  DroppableNavLink: ({
    to,
    children,
    ...props
  }: {
    to: string;
    children: (state: { isActive: boolean }) => React.ReactNode;
  }) => (
    <a href={to} {...props}>
      {children({ isActive: false })}
    </a>
  ),
}));

import { RailFooter } from "./RailFooter";

const profile = (label: Record<string, unknown>) => ({
  id: "p1",
  label,
  identity: { baseUrl: "https://lok.test/", userId: "u1", organizationId: "o1" },
  status: "ok",
});

const renderFooter = () =>
  render(
    <MemoryRouter>
      <RailFooter />
    </MemoryRouter>,
  );

describe("RailFooter", () => {
  beforeEach(() => {
    autoLoggingIn.mockReturnValue(false);
    parkSession.mockClear();
  });

  it("is the only sign that a launch is still proving its token", () => {
    // The app opens straight into the shell, so there is no splash and no page
    // skeleton to say "wait" — the footer carries it, without hiding the
    // account, which is known from the cached label.
    activeProfile.mockReturnValue(
      profile({ organizationName: "Acme Labs", username: "jhnnsrs" }),
    );
    autoLoggingIn.mockReturnValue(true);
    renderFooter();

    expect(screen.getByText("Acme Labs")).toBeInTheDocument();
    expect(screen.getByText("Signing in…")).toBeInTheDocument();
    expect(screen.getByTestId("rail-footer-signing-in")).toBeInTheDocument();
    expect(screen.queryByText("jhnnsrs")).toBeNull();
  });

  it("goes back to naming the account once the session is live", () => {
    activeProfile.mockReturnValue(
      profile({ organizationName: "Acme Labs", username: "jhnnsrs" }),
    );
    renderFooter();

    expect(screen.getByText(/jhnnsrs/)).toBeInTheDocument();
    expect(screen.queryByTestId("rail-footer-signing-in")).toBeNull();
  });

  it("names the organization, which is the app's most consequential state", () => {
    // Every id on screen belongs to one organization; it used to be a badge
    // buried two levels inside an avatar menu.
    activeProfile.mockReturnValue(
      profile({ organizationName: "Acme Labs", username: "jhnnsrs", deploymentName: "lok.test" }),
    );
    renderFooter();

    expect(screen.getByText("Acme Labs")).toBeInTheDocument();
    expect(screen.getByText(/jhnnsrs/)).toBeInTheDocument();
  });

  it("leads with the hub and keeps the organization under it", () => {
    // Two approvals of one organization differ only by hub, so the hub is the
    // thing being chosen between; the organization places it.
    activeProfile.mockReturnValue(
      profile({
        hubName: "Imaging",
        organizationName: "Acme Labs",
        username: "jhnnsrs",
        deploymentName: "lok.test",
      }),
    );
    renderFooter();

    expect(screen.getByText("Imaging")).toBeInTheDocument();
    expect(screen.getByText(/^Acme Labs · jhnnsrs/)).toBeInTheDocument();
  });

  it("falls back to the deployment before lok has named the organization", () => {
    activeProfile.mockReturnValue(profile({ deploymentName: "lok.test" }));
    renderFooter();
    // Name and detail both come out as the deployment — it is all there is.
    expect(screen.getAllByText("lok.test").length).toBeGreaterThan(0);
  });

  it("still says something useful when signed out", () => {
    // It renders from the profile book, not a lok query, so it works offline
    // and while signed out.
    activeProfile.mockReturnValue(null);
    renderFooter();
    expect(screen.getByText("Not signed in")).toBeInTheDocument();
  });

  it("parks the session for managing accounts instead of opening a dialog", async () => {
    // Adding an account hands off to an external browser for up to a minute,
    // which a menu that closes on every click cannot host. This puts the real
    // sign-in screen back, with nothing signed out.
    activeProfile.mockReturnValue(profile({ organizationName: "Acme Labs" }));
    renderFooter();

    await userEvent.click(screen.getByText("Acme Labs"));
    await userEvent.click(await screen.findByText("Manage accounts…"));

    expect(parkSession).toHaveBeenCalled();
    // Opening a Radix menu through `userEvent` and waiting out its animation is
    // slow enough to trip the 5s default when the whole suite runs in parallel.
  }, 20000);

  it("opens on request, so other surfaces can point here instead of listing accounts", async () => {
    // Settings → Account has a "Switch account" button rather than a second
    // copy of the list; this is the seam it calls.
    activeProfile.mockReturnValue(profile({ organizationName: "Acme Labs" }));
    renderFooter();

    expect(screen.queryByText("Switch organization")).toBeNull();

    await act(async () => {
      openRailSwitcher();
    });

    expect(await screen.findByText("Switch organization")).toBeInTheDocument();
  }, 20000);

  it("puts settings beside it as a single gear, not a menu item", () => {
    activeProfile.mockReturnValue(profile({ organizationName: "Acme Labs" }));
    renderFooter();

    const gear = screen.getByLabelText("Settings");
    expect(gear).toBeInTheDocument();
    expect(gear).toHaveAttribute("href", "/settings");
  });
});
