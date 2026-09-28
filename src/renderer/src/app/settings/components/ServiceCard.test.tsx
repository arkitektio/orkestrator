// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MeshStatusPayload } from "../../../../../main/mesh/protocol";
import type { ServiceRuntimeState } from "@/core/connection/arkitekt/types";
import { ServiceCard } from "./ServiceCard";

const alias = (id: string, host: string, ssl = true) => ({ id, host, ssl, challenge: "ht", port: null, path: "mikro" });

const service = (host: string, overrides: Partial<ServiceRuntimeState> = {}): ServiceRuntimeState =>
  ({
    key: "mikro",
    configured: true,
    definition: { key: "mikro", description: "Images" },
    instance: { identifier: "3", service: "live.arkitekt.mikro", aliases: [alias("a", "mikro.example.org"), alias("b", host)] },
    alias: alias("b", host),
    status: "ready",
    errors: [],
    lastCheckedAt: Date.now() - 120_000,
    ...overrides,
  }) as ServiceRuntimeState;

const mesh = {
  sidecar: { state: "ready", version: "t" },
  meshes: [
    {
      config: { id: "lab", label: "Lab mesh", controlUrl: "https://mesh.arkitekt.live", hosts: [], hasNodeState: true },
      status: {
        id: "lab",
        state: "running",
        proxyPort: 1080,
        peers: [{ dnsName: "hub.lab.mesh.arkitekt.live.", ips: ["100.64.0.9"], online: true, relay: "fra" }],
      },
    },
  ],
} as unknown as MeshStatusPayload;

describe("ServiceCard", () => {
  it("says a service is reached through the mesh, and through which machine", () => {
    render(<ServiceCard service={service("hub.lab.mesh.arkitekt.live")} mesh={mesh} />);
    expect(screen.getByText(/through the mesh/i)).toHaveTextContent("Through the mesh Lab mesh · hub.lab.mesh.arkitekt.live · relayed via fra");
    expect(screen.getByText("https://hub.lab.mesh.arkitekt.live/mikro")).toBeInTheDocument();
    expect(screen.getByText(/alias 2 of 2/)).toBeInTheDocument();
  });

  it("says a direct connection goes over the internet, and whether it is encrypted", () => {
    render(<ServiceCard service={service("mikro.example.org", { alias: alias("a", "mikro.example.org") })} mesh={mesh} />);
    expect(screen.getByText(/direct over the internet/i)).toBeInTheDocument();
    expect(screen.getByText(/HTTPS/)).toBeInTheDocument();
    expect(screen.getByText(/2 minutes ago/)).toBeInTheDocument();
  });

  it("flags a mesh-looking address that no running mesh routes", () => {
    const stopped = {
      ...mesh,
      meshes: mesh.meshes.map((snapshot) => ({ ...snapshot, status: { ...snapshot.status, state: "stopped" } })),
    } as MeshStatusPayload;
    render(<ServiceCard service={service("hub.lab.mesh.arkitekt.live")} mesh={stopped} />);
    expect(screen.getByText(/looks like a mesh address/i)).toBeInTheDocument();
  });

  it("says when no alias answered", () => {
    render(<ServiceCard service={service("x", { alias: undefined, status: "invalid" })} />);
    expect(screen.getByText("none of 2 answered")).toBeInTheDocument();
  });

  it("shows its state as a toned status, not a filled badge", () => {
    const { rerender } = render(<ServiceCard service={service("mikro.example.org")} />);
    expect(screen.getByText("Reachable")).toHaveClass("text-emerald-600");
    rerender(<ServiceCard service={service("mikro.example.org", { status: "invalid" })} />);
    expect(screen.getByText("Unreachable")).toHaveClass("text-destructive");
    rerender(<ServiceCard service={service("mikro.example.org", { status: "checking" })} />);
    expect(screen.getByText("Checking")).toHaveClass("text-amber-600");
  });
});
