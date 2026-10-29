// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/core/linkers", () => {
  const Link = ({ children }: { children: React.ReactNode }) => <a>{children}</a>;
  return {
    RekuestState: { DetailLink: Link },
    RekuestMemoryShelve: { DetailLink: Link },
    RekuestSpace: { DetailLink: Link },
    RekuestAgent: { DetailLink: Link },
  };
});
// Fetches the protocol through Apollo on click; not what is under test.
vi.mock("../components/copy-agent-python", () => ({
  CopyAgentPythonButton: () => <button>Copy as Python</button>,
}));
vi.mock("@/core/ui/timestamp", () => ({ default: () => <span>a while ago</span> }));
// Another module's object: the host draws it, so a stand-in names what was asked for.
vi.mock("@/core/smart/display/StructureDisplay", () => ({
  StructureDisplay: ({ identifier, id }: { identifier: string; id: string }) => (
    <span>{`${identifier}:${id}`}</span>
  ),
}));

import { AgentKind, type AgentFragment } from "../api/graphql";
import { AgentFacts } from "./AgentInfoSidebar";

const agent = (patch: Partial<AgentFragment> = {}): AgentFragment =>
  ({
    id: "1",
    hash: "abc123",
    name: "Microscope",
    declaredName: "Microscope",
    description: null,
    kind: AgentKind.Websocket,
    installedAt: "2026-10-01T00:00:00Z",
    blocked: false,
    pinned: false,
    active: true,
    connected: true,
    lastSeen: "2026-10-28T00:00:00Z",
    supervisor: null,
    implementations: [{ id: "i1" }, { id: "i2" }],
    memoryShelve: null,
    states: [],
    placements: [],
    tasks: [],
    client: {
      clientId: "client-1",
      release: { version: "1.2.0", app: { identifier: "mikro-acquire" } },
      device: { deviceId: "dev-9" },
    },
    user: { sub: "user-7" },
    ...patch,
  }) as unknown as AgentFragment;

describe("AgentFacts", () => {
  it("says what the agent runs as, whose it is and what it provides", () => {
    render(<AgentFacts agent={agent({ description: "Drives the stage" })} />);

    expect(screen.getByText("Drives the stage")).toBeTruthy();
    expect(screen.getByText("mikro-acquire")).toBeTruthy();
    expect(screen.getByText(/v1\.2\.0/)).toBeTruthy();
    expect(screen.getByText("Websocket")).toBeTruthy();
    expect(screen.getByText("dev-9")).toBeTruthy();
    expect(screen.getByText("@lok/client:client-1")).toBeTruthy();
    expect(screen.getByText("@lok/user:user-7")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("Online")).toBeTruthy();
  });

  it("names the declared name only when the agent was renamed", () => {
    const { rerender } = render(<AgentFacts agent={agent()} />);
    expect(screen.queryByText(/Declared as/)).toBeNull();

    rerender(<AgentFacts agent={agent({ name: "Stage left", declaredName: "Microscope" })} />);
    expect(screen.getByText(/Declared as/)).toBeTruthy();
  });

  it("leaves out what the agent does not have", () => {
    render(<AgentFacts agent={agent({ client: { clientId: "c", release: null, device: null } as never })} />);

    expect(screen.queryByText("Holds")).toBeNull();
    expect(screen.queryByText("Supervisor")).toBeNull();
    expect(screen.queryByText("App")).toBeNull();
    expect(screen.queryByText("Device")).toBeNull();
    expect(screen.queryByText("Blocked")).toBeNull();
  });

  it("lists its states, shelf and space, and flags a blocked agent", () => {
    render(
      <AgentFacts
        agent={agent({
          blocked: true,
          states: [{ id: "s1", definition: { name: "stage-position" } }] as never,
          memoryShelve: { id: "m1" } as never,
          placements: [{ id: "p1", space: { id: "sp1", name: "Lab A" } }] as never,
        })}
      />,
    );

    expect(screen.getByText("Holds")).toBeTruthy();
    expect(screen.getByText("stage-position")).toBeTruthy();
    expect(screen.getByText("Memory shelf")).toBeTruthy();
    expect(screen.getByText("Lab A")).toBeTruthy();
    expect(screen.getByText("Blocked")).toBeTruthy();
  });

  it("links the agent's tasks, states and bloks pages, and copies it as Python", () => {
    render(<AgentFacts agent={agent()} />);
    expect(screen.getByText("Show tasks")).toBeTruthy();
    expect(screen.getByText("Show states")).toBeTruthy();
    expect(screen.getByText("Show bloks")).toBeTruthy();
    expect(screen.getByText("Copy as Python")).toBeTruthy();
  });
});
