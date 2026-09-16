// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const profileId = vi.fn<[], string | null>(() => "org-a");
vi.mock("@/app/Arkitekt", () => ({
  Arkitekt: { useActiveProfileId: () => profileId() },
}));

vi.mock("@/providers/smart/registry", () => ({
  smartRegistry: {
    buildModelPath: (identifier: string, id: string) =>
      identifier === "@mikro/arraydataset" ? `mikro/arraydatasets/${id}` : undefined,
    getDisplayName: () => "Array Dataset",
  },
}));

import { PinsProvider, usePins } from "./PinsProvider";
import { pinsStorageKey } from "./pins";

const Probe = () => {
  const { pins, activeKey, isCurrentPinned, canPin, pin, unpin, select } = usePins();
  const { pathname } = useLocation();

  return (
    <div>
      <span data-testid="path">{pathname}</span>
      <span data-testid="can-pin">{String(canPin)}</span>
      <button onClick={() => pin({ kind: "route", route: "/mikro/arraydatasets/1", label: "Same page" })}>
        pinSameRoute
      </button>
      <button onClick={() => select("route:/mikro/arraydatasets/1")}>selectRoute</button>
      <span data-testid="active">{activeKey ?? "none"}</span>
      <span data-testid="current-pinned">{String(isCurrentPinned)}</span>
      <span data-testid="labels">{pins.map((p) => p.label).join(",")}</span>
      <button onClick={() => pin({ kind: "entity", identifier: "@mikro/arraydataset", id: "1", label: "One" })}>
        pin1
      </button>
      <button onClick={() => pin({ kind: "route", route: "/settings", label: "Settings" })}>
        pinSettings
      </button>
      <button onClick={() => select("entity:@mikro/arraydataset:1")}>select1</button>
      <button onClick={() => select("route:/settings")}>selectSettings</button>
      <button onClick={() => unpin("entity:@mikro/arraydataset:1")}>unpin1</button>
    </div>
  );
};

const renderAt = (initial = "/") =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <PinsProvider>
        <Routes>
          <Route path="*" element={<Probe />} />
        </Routes>
      </PinsProvider>
    </MemoryRouter>,
  );

const click = (label: string) => act(() => screen.getByText(label).click());

beforeEach(() => {
  localStorage.clear();
  profileId.mockReturnValue("org-a");
});

describe("pinning", () => {
  it("adds without navigating — pinning is not going", () => {
    renderAt("/kraph/graphs");
    click("pin1");
    expect(screen.getByTestId("labels").textContent).toBe("One");
    expect(screen.getByTestId("path").textContent).toBe("/kraph/graphs");
  });

  it("navigates only when a pin is selected", () => {
    renderAt("/kraph/graphs");
    click("pin1");
    click("select1");
    expect(screen.getByTestId("path").textContent).toBe("/mikro/arraydatasets/1");
  });

  it("persists per profile so the rail survives a reload", () => {
    renderAt();
    click("pin1");
    expect(localStorage.getItem(pinsStorageKey("org-a"))).toContain("One");
  });

  it("unpins without moving the user", () => {
    renderAt();
    click("pin1");
    click("select1");
    click("unpin1");
    expect(screen.getByTestId("labels").textContent).toBe("");
    // Removing a bookmark should not also navigate away from the page.
    expect(screen.getByTestId("path").textContent).toBe("/mikro/arraydatasets/1");
  });
});

describe("the active pin is derived from the URL", () => {
  it("highlights whichever pin matches the current path", () => {
    renderAt();
    click("pin1");
    expect(screen.getByTestId("active").textContent).toBe("none");

    click("select1");
    expect(screen.getByTestId("active").textContent).toBe("entity:@mikro/arraydataset:1");
  });

  it("knows whether the page on screen is already pinned", () => {
    // What the rail's "+" affordance hangs off — offering to pin something
    // twice is offering a no-op.
    renderAt("/settings");
    expect(screen.getByTestId("current-pinned").textContent).toBe("false");
    click("pinSettings");
    expect(screen.getByTestId("current-pinned").textContent).toBe("true");
  });
});

describe("which pin is highlighted", () => {
  const active = () => screen.getByTestId("active").textContent;

  it("prefers the pin the user clicked when two point at the same page", () => {
    // An entity pin and a route pin can resolve to one path; nothing in the URL
    // separates them, so the click is the only signal there is.
    renderAt("/kraph/graphs");
    click("pin1");
    click("pinSameRoute");

    click("selectRoute");
    expect(active()).toBe("route:/mikro/arraydatasets/1");

    click("select1");
    expect(active()).toBe("entity:@mikro/arraydataset:1");
  });

  it("drops the preference once the user navigates away", () => {
    // The click is a tiebreaker among matching pins, never an override.
    renderAt("/settings");
    click("pinSettings");
    click("pin1");
    click("select1");
    expect(active()).toBe("entity:@mikro/arraydataset:1");

    click("selectSettings");
    expect(active()).toBe("route:/settings");
  });
});

describe("when signed out", () => {
  // Pins belong to a membership: an entity id is scoped to one organization, so
  // a pin made with nobody signed in points at something unresolvable and could
  // not honestly be carried into whichever organization signed in next.
  beforeEach(() => profileId.mockReturnValue(null));

  it("reports that pinning is not possible", () => {
    renderAt("/kraph/graphs");
    expect(screen.getByTestId("can-pin").textContent).toBe("false");
  });

  it("refuses to pin, even when asked directly", () => {
    // Guarded in the provider, not only in the UI: ⌘T and the palette reach
    // this without going near the rail's affordance.
    renderAt("/kraph/graphs");
    click("pin1");
    expect(screen.getByTestId("labels").textContent).toBe("");
  });

  it("writes nothing to storage", () => {
    renderAt("/kraph/graphs");
    click("pin1");
    expect(localStorage.length).toBe(0);
  });

  it("shows no pins from any membership", () => {
    renderAt("/kraph/graphs");
    expect(screen.getByTestId("labels").textContent).toBe("");
  });
});
