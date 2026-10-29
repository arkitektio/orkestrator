// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ComponentContext,
  PortKind,
  TaskBlokRole,
  type ImplementationInteractionFragment,
} from "@/rekuest/api/graphql";

vi.mock("../DemoBlokRenderer", () => ({
  DemoBlokRenderer: ({ surfaceId }: { surfaceId: string }) => (
    <div data-testid="demo">{surfaceId}</div>
  ),
}));

import {
  DeclaredInteractions,
  DynamicCapabilityBadges,
} from "./DeclaredInteractions";

const port = (key: string, kind: PortKind, nullable = false) => ({
  key,
  kind,
  nullable,
  label: null,
  identifier: null,
});

const interaction = (
  id: string,
  key: string,
  role: TaskBlokRole,
  extra: Partial<ImplementationInteractionFragment["blok"]> = {},
): ImplementationInteractionFragment => ({
  id,
  key,
  role,
  description: `${key} described`,
  blok: {
    id: `blok-${id}`,
    context: ComponentContext.Html,
    heldByAction: true,
    componentTree: [],
    vocab: 2,
    catalogs: ["ui@1"],
    args: [],
    returns: [],
    resolvedLocals: [],
    demo: null,
    queries: [],
    subscriptions: [],
    ...extra,
  },
});

describe("DeclaredInteractions", () => {
  it("renders nothing for an implementation that declared none", () => {
    const { container } = render(<DeclaredInteractions interactions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists asks before informs, each with its key and description", () => {
    render(
      <DeclaredInteractions
        interactions={[
          interaction("1", "ui.finished", TaskBlokRole.Inform),
          interaction("2", "ui.pick_channels", TaskBlokRole.Ask),
        ]}
      />,
    );
    const keys = screen
      .getAllByText(/^ui\.[a-z_]+$/)
      .map((element) => element.textContent);
    expect(keys).toEqual(["ui.pick_channels", "ui.finished"]);
    expect(screen.getByText("Ask")).toBeInTheDocument();
    expect(screen.getByText("Inform")).toBeInTheDocument();
    expect(screen.getByText("ui.finished described")).toBeInTheDocument();
  });

  it("shows an ask's args and returns, and an inform's args only", () => {
    render(
      <DeclaredInteractions
        interactions={[
          interaction("1", "ui.pick", TaskBlokRole.Ask, {
            args: [port("dataset", PortKind.Structure), port("error", PortKind.String, true)],
            returns: [port("cluster", PortKind.Structure)],
          }),
          interaction("2", "ui.progress", TaskBlokRole.Inform, {
            args: [port("step", PortKind.Int)],
            returns: [port("never", PortKind.Int)],
          }),
        ]}
      />,
    );
    expect(screen.getByText("dataset: structure")).toBeInTheDocument();
    expect(screen.getByText("error?: string")).toBeInTheDocument();
    expect(screen.getByText("cluster: structure")).toBeInTheDocument();
    expect(screen.getByText("step: int")).toBeInTheDocument();
    expect(screen.queryByText("never: int")).not.toBeInTheDocument();
    expect(screen.getAllByText("Answered with")).toHaveLength(1);
  });

  it("draws the blok's preview only when asked", () => {
    render(
      <DeclaredInteractions
        interactions={[interaction("7", "ui.pick", TaskBlokRole.Ask)]}
      />,
    );
    expect(screen.queryByTestId("demo")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByTestId("demo")).toHaveTextContent("interaction-7");
  });
});

describe("DynamicCapabilityBadges", () => {
  it("shows one badge per capability the implementation declares", () => {
    render(
      <DynamicCapabilityBadges
        implementation={{
          dynamicCalls: true,
          dynamicAsks: false,
          dynamicInforms: true,
        }}
      />,
    );
    expect(screen.getByText("Dynamic calls")).toBeInTheDocument();
    expect(screen.queryByText("Dynamic asks")).not.toBeInTheDocument();
    expect(screen.getByText("Dynamic informs")).toBeInTheDocument();
  });
});
