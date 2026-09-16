// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const pinsValue = vi.fn();
vi.mock("@/command/PinsProvider", () => ({ usePins: () => pinsValue() }));
vi.mock("use-react-router-breadcrumbs", () => ({ default: () => [{ breadcrumb: "Here" }] }));
vi.mock("@/providers/smart/registry", () => ({
  smartRegistry: { getDisplayName: () => "Array Dataset" },
}));

import RailPins from "./RailPins";

const LONG_LABEL =
  "a_pinned_page_whose_name_is_far_longer_than_two_hundred_and_forty_pixels_allows";

const entity = (id: string, label: string) => ({
  kind: "entity" as const,
  identifier: "@mikro/arraydataset",
  id,
  label,
});

const value = (over: Record<string, unknown> = {}) => ({
  pins: [],
  activeKey: undefined,
  isCurrentPinned: false,
  canPin: true,
  pin: vi.fn(),
  unpin: vi.fn(),
  select: vi.fn(),
  ...over,
});

const renderPins = () =>
  render(
    <MemoryRouter initialEntries={["/mikro/arraydatasets/1"]}>
      <RailPins />
    </MemoryRouter>,
  );

beforeEach(() => pinsValue.mockReturnValue(value()));

describe("overflow containment", () => {
  // jsdom does no layout, so what is pinned is the CONTRACT — the classes that
  // decide whether a row clips or widens the rail.
  it("clips a long label instead of widening the rail", () => {
    pinsValue.mockReturnValue({ ...value({ pins: [entity("1", LONG_LABEL)] }) });
    renderPins();

    const label = screen.getByText(LONG_LABEL);
    expect(label.className).toContain("truncate");
    // Without `min-w-0` a flex item's automatic minimum size is its content, so
    // `truncate` never engages and the row grows past the rail.
    expect(label.className).toContain("min-w-0");

    const row = label.closest("[role='button']");
    expect(row?.className).toContain("min-w-0");
    expect(row?.className).toContain("overflow-hidden");
  });

  it("keeps the section heading visible while the list scrolls", () => {
    pinsValue.mockReturnValue(
      value({ pins: Array.from({ length: 30 }, (_, i) => entity(String(i), `Pin ${i}`)) }),
    );
    renderPins();
    expect(screen.getByText("Pinned").parentElement?.className).toContain("sticky");
  });
});

describe("the active row", () => {
  it("is a translucent panel, not a solid chip", () => {
    // The transparency is the point: the rail's brand-tinted surface shows
    // through, so the row reads as a pane lifted off it.
    pinsValue.mockReturnValue(
      value({
        pins: [entity("1", "Active")],
        activeKey: "entity:@mikro/arraydataset:1",
      }),
    );
    renderPins();

    const row = screen.getByText("Active").closest("[role='button']");
    expect(row?.className).toContain("bg-background/70");
    expect(row?.className).toContain("ring-1");
    expect(row?.className).not.toContain("bg-background ");
  });

  it("leaves inactive rows unfilled until hovered", () => {
    pinsValue.mockReturnValue(value({ pins: [entity("1", "Idle")], activeKey: undefined }));
    renderPins();

    const row = screen.getByText("Idle").closest("[role='button']");
    expect(row?.className).toContain("text-muted-foreground");
    expect(row?.className).toContain("hover:bg-background/35");
  });
});

describe("the empty state", () => {
  it("explains itself rather than showing a bare heading", () => {
    renderPins();
    expect(screen.getByText(/Pin a page to keep it here/)).toBeInTheDocument();
  });

  it("offers to pin the page you are on", () => {
    renderPins();
    expect(screen.getByLabelText("Pin Here")).toBeInTheDocument();
  });

  it("does not offer to pin something already pinned", () => {
    pinsValue.mockReturnValue(value({ isCurrentPinned: true }));
    renderPins();
    expect(screen.queryByLabelText("Pin Here")).not.toBeInTheDocument();
  });
});

describe("when signed out", () => {
  // A pin points at a tenant-scoped id, so one made with no membership behind
  // it belongs to nobody — the rail says so rather than offering a control that
  // would quietly do nothing.
  it("explains why nothing can be pinned", () => {
    pinsValue.mockReturnValue(value({ canPin: false }));
    renderPins();
    expect(screen.getByText(/Sign in to pin pages here/)).toBeInTheDocument();
  });

  it("offers no way to pin the current page", () => {
    pinsValue.mockReturnValue(value({ canPin: false }));
    renderPins();
    expect(screen.queryByLabelText("Pin Here")).not.toBeInTheDocument();
  });

  it("does not show the signed-in empty prompt as well", () => {
    pinsValue.mockReturnValue(value({ canPin: false }));
    renderPins();
    expect(screen.queryByText(/Pin a page to keep it here/)).not.toBeInTheDocument();
  });
});
