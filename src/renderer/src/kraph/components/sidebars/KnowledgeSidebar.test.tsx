// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const knowledge = vi.fn();
const informing = vi.fn();
const me = vi.fn();

vi.mock("@/app/Arkitekt", () => ({
  Guard: { Lok: ({ children }: { children: React.ReactNode }) => <>{children}</> },
  useKraph: () => ({}),
}));
vi.mock("@/lok/api/graphql", () => ({ useMeQuery: () => me() }));
vi.mock("@/kraph/api/graphql", () => ({
  InstanceKind: { Entity: "ENTITY" },
  TermKind: { Entity: "ENTITY" },
  useKnowledgeForStructureQuery: (o: unknown) => knowledge(o),
  useAssertEntityExistsMutation: () => [vi.fn(), {}],
  useAssertInformsMutation: () => [vi.fn(), {}],
  useSearchAssignableTermsQuery: () => ({ data: { terms: [] }, loading: false }),
  useInformingStructuresQuery: (o: unknown) => informing(o),
}));
vi.mock("@/hooks/use-debounce", () => ({ useDebounce: (v: unknown) => v }));
// Surfaces with their own plumbing: the discussion, the drop zone, the drag
// target, the measurement button and the evidence popover.
vi.mock("../komments/Komments", () => ({ Komments: () => <div data-testid="komments" /> }));
vi.mock("@/providers/smart/Drop", () => ({
  SmartDropZone: ({ children }: { children: React.ReactNode }) => <div data-testid="dropzone">{children}</div>,
}));
vi.mock("../knowledge/SameAsDropTarget", () => ({
  SameAsDropTarget: ({ term }: { term: string }) => <div data-testid="same-as-drop">{term}</div>,
}));
vi.mock("@/providers/smart/ObjectButton", () => ({
  ObjectButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/kraph/components/AssertionEvidence", () => ({ AssertionEvidence: () => null }));
vi.mock("@/kraph/components/EntityAssigner", () => ({ EntityAssigner: () => <div data-testid="entity-assigner" /> }));
vi.mock("@/kraph/components/tables/MetricsTable", () => ({
  MetricsTable: ({ metrics }: { metrics: unknown[] }) => <div data-testid="metrics">{metrics.length}</div>,
}));
vi.mock("@/command/Menu", () => ({
  DisplayWidget: ({ identifier, object }: { identifier: string; object: string }) => (
    <span data-testid="display">{identifier}:{object}</span>
  ),
}));
vi.mock("@/linkers", () => {
  const link =
    (name: string) =>
    ({ object, scope, children }: { object: { id: string }; scope?: string; children: React.ReactNode }) => (
      <a data-testid={`link-${name}`} data-id={object.id} data-scope={scope}>
        {children}
      </a>
    );
  return {
    KraphNode: { DetailLink: link("node") },
    KraphGraph: { DetailLink: link("graph") },
    KraphTerm: { DetailLink: link("term") },
  };
});

import { KnowledgeSidebar } from "./KnowledgeSidebar";

const instance = (id: string, key: string, over: Partial<Record<string, unknown>> = {}) => ({
  id,
  kind: "ENTITY",
  createdAt: "2026-01-01T00:00:00Z",
  term: { id: `t-${key}`, kind: "ENTITY", key, label: null, color: [10, 20, 30] },
  assertion: { id: `a-${id}`, subject: "user-1", assertedAt: "2026-01-01T00:00:00Z" },
  component: [id],
  sameAs: [],
  drawnIn: [],
  ...over,
});

const object = { id: "img-1" };

beforeEach(() => {
  knowledge.mockReset();
  informing.mockReset();
  me.mockReset();
  me.mockReturnValue({ data: { me: { id: "user-1" } } });
  informing.mockReturnValue({ data: { informingStructures: [] }, loading: false });
});

describe("KnowledgeSidebar", () => {
  it("renders the labels it reads, and the empty measurement state", () => {
    knowledge.mockReturnValue({
      data: { structureByIdentifier: { metrics: [], informs: [instance("i1", "AIS"), instance("i2", "Soma")] } },
      loading: false,
      refetch: vi.fn(),
    });
    render(<KnowledgeSidebar identifier="@mikro/file" object={object} />);
    expect(screen.getByRole("button", { name: "AIS" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Soma" })).toBeInTheDocument();
    expect(screen.getByText("Nothing has been measured on this yet.")).toBeInTheDocument();
    expect(screen.getByTestId("komments")).toBeInTheDocument();
    expect(screen.queryByTestId("label-card")).not.toBeInTheDocument();
  });

  it("opens a chip into its card: drawn-in links carry the graph scope, sameness by evidence, advanced collapsed", () => {
    knowledge.mockReturnValue({
      data: {
        structureByIdentifier: {
          metrics: [{ id: "m1" }, { id: "m2" }],
          informs: [
            instance("i1", "AIS", {
              component: ["i1", "i9"],
              drawnIn: [
                {
                  graph: { id: "g1", name: "Neurons" },
                  category: { id: "c1", label: "Axon initial segment" },
                  node: { id: "n1", label: "AIS" },
                },
              ],
            }),
          ],
        },
      },
      loading: false,
      refetch: vi.fn(),
    });
    informing.mockReturnValue({
      data: {
        informingStructures: [
          { id: "s-self", identifier: "@mikro/file", object: "img-1" },
          { id: "s-other", identifier: "@mikro/file", object: "img-7" },
        ],
      },
      loading: false,
    });
    render(<KnowledgeSidebar identifier="@mikro/file" object={object} />);

    fireEvent.click(screen.getByRole("button", { name: "AIS" }));
    const card = screen.getByTestId("label-card");
    expect(card).toBeInTheDocument();

    const nodeLink = screen.getByTestId("link-node");
    expect(nodeLink).toHaveAttribute("data-id", "n1");
    expect(nodeLink).toHaveAttribute("data-scope", "g1");
    expect(screen.getByTestId("link-graph")).toHaveTextContent("Neurons");
    expect(screen.getByText(/Axon initial segment/)).toBeInTheDocument();

    expect(informing).toHaveBeenCalledWith(expect.objectContaining({ variables: { entityId: "i9" } }));
    // The datum's own structure is not listed as "the same as" itself.
    expect(screen.getAllByTestId("display").map((n) => n.textContent)).toEqual(["@mikro/file:img-7"]);

    expect(screen.getByText("by you")).toBeInTheDocument();
    expect(screen.getByTestId("same-as-drop")).toHaveTextContent("AIS");
    expect(screen.queryByTestId("entity-assigner")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/Advanced: use as evidence/));
    expect(screen.getByTestId("entity-assigner")).toBeInTheDocument();

    expect(screen.getByTestId("metrics")).toHaveTextContent("2");
  });

  it("shows an empty, claimable state for a datum nobody has claimed about", () => {
    knowledge.mockReturnValue({
      data: undefined,
      loading: false,
      error: { networkError: null, graphQLErrors: [{ message: "x", path: ["structureByIdentifier"] }] },
      refetch: vi.fn(),
    });
    render(<KnowledgeSidebar identifier="@mikro/file" object={object} />);
    expect(screen.getByLabelText("Label this datum")).toBeInTheDocument();
    expect(screen.queryByText(/Could not read/)).not.toBeInTheDocument();
  });

  it("does not mark someone else's claim as yours", () => {
    me.mockReturnValue({ data: { me: { id: "user-2" } } });
    knowledge.mockReturnValue({
      data: { structureByIdentifier: { metrics: [], informs: [instance("i1", "AIS")] } },
      loading: false,
      refetch: vi.fn(),
    });
    render(<KnowledgeSidebar identifier="@mikro/file" object={object} />);
    fireEvent.click(screen.getByRole("button", { name: "AIS" }));
    expect(screen.queryByText("by you")).not.toBeInTheDocument();
  });
});
