// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DisplayWidgetProps } from "@/core/lib/display/registry";

const Shown = (props: DisplayWidgetProps) => (
  <span data-testid="shown" data-by={props.by ?? ""} data-variant={props.variant ?? ""}>
    {props.id}
  </span>
);

vi.mock("@/core/smart/display/displays", () => ({
  useDisplay: () => ({ registry: { "@lok/client": Shown } }),
}));
vi.mock("@/core/providers/smart/builder", () => ({
  SmartLink: ({ children }: { children: React.ReactNode }) => <a data-testid="link">{children}</a>,
}));

import { StructureDisplay } from "./StructureDisplay";

describe("StructureDisplay", () => {
  it("hands the owning display the key the caller holds", () => {
    render(<StructureDisplay identifier="@lok/client" by="clientId" id="abc" variant="inline" />);
    const shown = screen.getByTestId("shown");
    expect(shown.dataset.by).toBe("clientId");
    expect(shown.dataset.variant).toBe("inline");
    expect(shown).toHaveTextContent("abc");
  });

  it("links only by the model's own id: a foreign key is not an address", () => {
    const { rerender } = render(<StructureDisplay identifier="@lok/client" id="1" link />);
    expect(screen.getByTestId("link")).toBeInTheDocument();
    rerender(<StructureDisplay identifier="@lok/client" by="clientId" id="1" link />);
    expect(screen.queryByTestId("link")).toBeNull();
  });

  it("shows the fallback when no module displays the identifier, nothing without an id", () => {
    const { rerender } = render(
      <StructureDisplay identifier="@nobody/thing" id="1" fallback={<span data-testid="fallback" />} />,
    );
    expect(screen.getByTestId("fallback")).toBeInTheDocument();
    rerender(<StructureDisplay identifier="@lok/client" id={undefined} fallback={<span data-testid="fallback" />} />);
    expect(screen.queryByTestId("fallback")).toBeNull();
    expect(screen.queryByTestId("shown")).toBeNull();
  });
});
