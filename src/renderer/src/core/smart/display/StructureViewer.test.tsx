// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ViewerWidgetProps } from "@/core/smart/display/registry";

const Opened = (props: ViewerWidgetProps) => (
  <span data-testid="opened" data-controls={String(props.controls)}>
    {props.id}
  </span>
);

// A getter: the factory is hoisted above `Opened`, and read only on render.
vi.mock("@/core/modules/registries", () => ({
  MODULE_VIEWERS: {
    get "@mikro/scene"() {
      return Opened;
    },
  },
}));
vi.mock("@/core/modules/host/host", () => ({ useModuleHostVersion: () => 0 }));

import { StructureViewer } from "./StructureViewer";

describe("StructureViewer", () => {
  it("opens the structure in the owning module's viewer", () => {
    render(<StructureViewer identifier="@mikro/scene" id="7" controls={false} />);
    const opened = screen.getByTestId("opened");
    expect(opened).toHaveTextContent("7");
    expect(opened.dataset.controls).toBe("false");
  });

  it("shows the fallback when no module has a viewer for it, nothing without an id", () => {
    const fallback = <span data-testid="fallback" />;
    const { rerender } = render(<StructureViewer identifier="@nobody/thing" id="1" fallback={fallback} />);
    expect(screen.getByTestId("fallback")).toBeInTheDocument();
    rerender(<StructureViewer identifier="@mikro/scene" id={null} fallback={fallback} />);
    expect(screen.queryByTestId("fallback")).toBeNull();
    expect(screen.queryByTestId("opened")).toBeNull();
  });
});
