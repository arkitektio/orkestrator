// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/**
 * A mesh whose hub has no address on it says so, instead of looking broken:
 * "Not needed", not "Not running", and a switch that would do nothing is off
 * limits.
 */

const state = { profile: undefined as unknown };
vi.mock("@/core/connection/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/connection/arkitekt/host")>()),
  Arkitekt: {
    useActiveProfile: () => state.profile,
    useSetProfileMesh: () => vi.fn(),
  },
}));
vi.mock("@/core/connection/mesh/useMeshes", () => ({
  useMeshes: () => ({
    available: true,
    sidecar: { state: "ready", version: "t" },
    meshes: [
      {
        config: { id: "lab", label: "Lab", controlUrl: "https://mesh.arkitekt.live", hosts: [], hasNodeState: true },
        status: { id: "lab", state: "stopped" },
      },
    ],
    error: undefined,
    pings: {},
    ping: vi.fn(),
    lockSign: vi.fn(),
    lockInit: vi.fn(),
    restart: vi.fn(),
  }),
}));
vi.mock("../components/SettingsPage", () => ({
  SettingsPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const { MeshPage } = await import("./MeshPage");

const MESH = { id: "lab", label: "Lab", controlUrl: "https://mesh.arkitekt.live", hosts: [], enabled: true };
const alias = (host: string) => ({ id: host, host, ssl: true, challenge: "ht" });
const profileWith = (hosts: string[]) => ({
  id: "p",
  mesh: MESH,
  identity: { baseUrl: "https://go.arkitekt.live/lok/f/", userId: "2", organizationId: "3" },
  label: { organizationName: "Lab" },
  session: {
    endpoint: { base_url: "https://go.arkitekt.live/lok/f/", mesh_coord_url: "https://mesh.arkitekt.live" },
    fakts: {
      instances: { mikro: { identifier: "3", service: "live.arkitekt.mikro", aliases: hosts.map(alias) } },
      self: { deployment_name: "lab", alias: alias("go.arkitekt.live") },
      statuses: {},
    },
  },
});

describe("MeshPage", () => {
  it("says the mesh makes no sense for a hub with no address on it", () => {
    state.profile = profileWith(["mikro.example.org"]);
    render(<MeshPage />);

    expect(screen.getByText(/none of this hub's services have an address on the mesh/i)).toBeInTheDocument();
    expect(screen.getByText("Not needed")).toBeInTheDocument();
    expect(screen.queryByText("Not running")).not.toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("names what the mesh carries when the hub needs it", () => {
    state.profile = profileWith(["mikro.lab.mesh.arkitekt.live"]);
    render(<MeshPage />);

    expect(screen.queryByText(/none of this hub's services/i)).not.toBeInTheDocument();
    expect(screen.getByText("Carries mikro.lab.mesh.arkitekt.live")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeEnabled();
  });
});
