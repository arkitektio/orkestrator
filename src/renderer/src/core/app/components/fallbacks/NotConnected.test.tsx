// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = { profiles: [] as unknown[], autoLoginError: null as string | null };

vi.mock("@/core/lib/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/lib/arkitekt/host")>()),
  Arkitekt: {
    useProfiles: () => state.profiles,
    useAutoLoginError: () => state.autoLoginError,
  },
}));

vi.mock("@/core/app/components/profile/ProfileCards", () => ({
  ProfileCards: () => <div>profile cards</div>,
}));
vi.mock("@/core/app/components/profile/AddProfileButton", () => ({
  AddProfileButton: ({ presentation }: { presentation?: string }) => (
    <div>add:{presentation ?? "tile"}</div>
  ),
}));
vi.mock("./CustomEndpointSheet", () => ({
  CustomEndpointSheet: () => <div>custom endpoint</div>,
}));
vi.mock("@/core/app/components/doctor/ConnectionDoctor", () => ({
  ConnectionDoctorSheet: () => <div>connection doctor</div>,
}));

const { NotConnected } = await import("./NotConnected");

describe("NotConnected", () => {
  beforeEach(() => {
    state.profiles = [];
    state.autoLoginError = null;
  });

  it("onboards a computer that holds no logins", () => {
    render(<NotConnected />);

    expect(screen.getByText("Let's get you started")).toBeTruthy();
    // The grant is the whole offer here, not a plus beside an empty row.
    expect(screen.getByText("add:hero")).toBeTruthy();
    expect(screen.queryByText("profile cards")).toBeNull();
  });

  it("offers the parked logins when there are any", () => {
    state.profiles = [{ id: "id-a" }];
    render(<NotConnected />);

    expect(screen.getByText("Welcome back")).toBeTruthy();
    expect(screen.getByText("profile cards")).toBeTruthy();
    expect(screen.getByText("add:tile")).toBeTruthy();
  });

  it("keeps the extra options folded away on an ordinary visit", () => {
    render(<NotConnected />);

    expect(screen.queryByText("connection doctor")).toBeNull();
    expect(screen.queryByText("custom endpoint")).toBeNull();
  });

  it("opens them, doctor included, when the automatic login just failed", () => {
    // Being told "couldn't reach it" with the way out folded away is the
    // worst version of this screen.
    state.autoLoginError = "Couldn't reach go.arkitekt.live";
    render(<NotConnected />);

    expect(screen.getByText("connection doctor")).toBeTruthy();
    expect(screen.getByText("custom endpoint")).toBeTruthy();
  });
});
