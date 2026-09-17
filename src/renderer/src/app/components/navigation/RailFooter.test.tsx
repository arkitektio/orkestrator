// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const activeProfile = vi.fn();

vi.mock("@/app/Arkitekt", () => ({
  Arkitekt: {
    useActiveProfile: () => activeProfile(),
  },
}));

vi.mock("@/app/components/profile/ProfileSwitcher", () => ({
  default: () => <div>switcher</div>,
  AddProfileActions: () => <div data-testid="add-actions">add</div>,
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
  it("names the organization, which is the app's most consequential state", () => {
    // Every id on screen belongs to one organization; it used to be a badge
    // buried two levels inside an avatar menu.
    activeProfile.mockReturnValue(
      profile({ organizationName: "Acme Labs", username: "jhnnsrs", deploymentName: "lok.test" }),
    );
    renderFooter();

    expect(screen.getByText("Acme Labs")).toBeInTheDocument();
    expect(screen.getByText("jhnnsrs")).toBeInTheDocument();
  });

  it("falls back to the deployment before lok has named the organization", () => {
    activeProfile.mockReturnValue(profile({ deploymentName: "lok.test" }));
    renderFooter();
    expect(screen.getByText("lok.test")).toBeInTheDocument();
  });

  it("still says something useful when signed out", () => {
    // It renders from the profile book, not a lok query, so it works offline
    // and while signed out.
    activeProfile.mockReturnValue(null);
    renderFooter();
    expect(screen.getByText("Not signed in")).toBeInTheDocument();
  });

  it("puts settings beside it as a single gear, not a menu item", () => {
    activeProfile.mockReturnValue(profile({ organizationName: "Acme Labs" }));
    renderFooter();

    const gear = screen.getByLabelText("Settings");
    expect(gear).toBeInTheDocument();
    expect(gear).toHaveAttribute("href", "/settings");
  });
});
