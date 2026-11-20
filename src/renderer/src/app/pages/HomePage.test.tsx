// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { useReportNotificationCount } from "@/core/dashboard/notificationCount";
import { recentsStorageKey } from "@/core/command/recents";

const state = vi.hoisted(() => ({
  services: [] as { key: string; status: string }[],
  notifications: 0,
  homeSections: false,
}));

const modules = [
  { key: "mikro", status: "ready", route: "/mikro", definition: { key: "mikro", label: "Mikro" } },
  { key: "kraph", status: "invalid", route: "/kraph", definition: { key: "kraph", label: "Kraph" } },
];
vi.mock("@/core/connection/arkitekt/host", () => ({
  Arkitekt: {
    useAvailableModules: () => modules,
    useAvailableServices: () => state.services,
    useActiveProfileId: () => "p1",
  },
}));
vi.mock("@/app/Arkitekt", () => ({ moduleRegistry: { mikro: { label: "Mikro" }, kraph: { label: "Kraph" } } }));
vi.mock("@/core/connection/arkitekt/hooks", () => ({
  useActiveProfile: () => ({ label: { organizationName: "The Lab" } }),
}));
vi.mock("@/core/connection/roles", () => ({ useRoles: () => ({ roles: [] }) }));
vi.mock("@/core/connection/useSelf", () => ({ useSelf: () => ({ userId: "u1", username: "ada" }) }));
vi.mock("@/core/modules/registries", () => ({ isModuleAllowed: () => true }));
vi.mock("@/core/modules/moduleIcons", () => ({ matchIcon: (k: string) => <i>{k}</i> }));
vi.mock("@/core/smart/registry", () => ({ smartRegistry: { getDisplayName: () => "Image" } }));
vi.mock("@/core/tabs/useTabTitle", () => ({ useTabTitle: () => {} }));
vi.mock("@/core/command/CommandPaletteProvider", () => ({ useCommandPalette: () => ({ openPalette: () => {} }) }));
vi.mock("@/core/command/useOpenTarget", () => ({ useOpenTarget: () => () => {} }));

// The modules' sections, reduced to: a notification source that reports its
// count, and one home block.
const Notifications = () => {
  useReportNotificationCount("test", state.notifications);
  return <>{state.notifications > 0 && <div>a mention</div>}</>;
};
vi.mock("@/core/layout/PageSections", () => ({
  SlotSections: ({ slot }: { slot: string }) =>
    slot === "notifications" ? <Notifications /> : state.homeSections ? <div>latest tasks</div> : null,
}));

import { HomePage, greetingAt, moduleOfRecent } from "./HomePage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  state.services = [];
  state.notifications = 0;
  state.homeSections = false;
});

describe("HomePage", () => {
  it("greets the member in their organization", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/, ada$/);
    expect(screen.getByText("The Lab")).toBeTruthy();
  });

  it("says nothing about healthy services, and names the one that is down", () => {
    const { unmount } = renderPage();
    expect(screen.queryByText(/not reachable/)).toBeNull();
    unmount();

    state.services = [
      { key: "mikro", status: "ready" },
      { key: "kraph", status: "invalid" },
    ];
    renderPage();
    expect(screen.getByText("Kraph is not reachable.")).toBeTruthy();
  });

  it("hides \"Needs you\" until a source reports something", () => {
    const { unmount } = renderPage();
    expect(screen.getByText("Needs you").closest("section")?.className).toContain("hidden");
    unmount();

    state.notifications = 2;
    renderPage();
    expect(screen.getByText("Needs you").closest("section")?.className).not.toContain("hidden");
    expect(screen.getByText("a mention")).toBeTruthy();
  });

  it("offers the palette's recents to go back to", () => {
    localStorage.setItem(
      recentsStorageKey("p1"),
      JSON.stringify([
        { kind: "entity", identifier: "@mikro/image", id: "7", label: "Cortex stack", at: 2 },
        { kind: "route", route: "/kraph/todos", label: "Todos", at: 1 },
      ]),
    );
    renderPage();
    expect(screen.getByText("Continue")).toBeTruthy();
    expect(screen.getByText("Cortex stack")).toBeTruthy();
    expect(screen.getByText("Todos")).toBeTruthy();
  });

  it("leaves the blocks' container empty when nothing has anything to show, so the modules take over", () => {
    const { container, unmount } = renderPage();
    // `peer-empty` is CSS; what the page owes it is a truly empty peer.
    expect(container.querySelector(".peer")?.childElementCount).toBe(0);
    // Only the modules that are up.
    expect(screen.getByText("Mikro")).toBeTruthy();
    expect(screen.queryByText("Kraph")).toBeNull();
    unmount();

    state.homeSections = true;
    const second = renderPage();
    expect(second.container.querySelector(".peer")?.childElementCount).toBe(1);
  });
});

describe("greetingAt", () => {
  it("follows the day", () => {
    expect(greetingAt(8)).toBe("Good morning");
    expect(greetingAt(14)).toBe("Good afternoon");
    expect(greetingAt(21)).toBe("Good evening");
    expect(greetingAt(2)).toBe("Good evening");
  });
});

describe("moduleOfRecent", () => {
  it("reads the module off an identifier or a route", () => {
    expect(moduleOfRecent({ kind: "entity", identifier: "@mikro/image", id: "1", label: "", at: 0 })).toBe("mikro");
    expect(moduleOfRecent({ kind: "route", route: "/kraph/todos", label: "", at: 0 })).toBe("kraph");
  });
});
