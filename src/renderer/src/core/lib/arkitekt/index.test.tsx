// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// `buildGuard` is a pure function of `useServiceState`. Stub the provider (and
// the hooks barrel it pulls in) so we can drive the service status directly
// without standing up the whole Arkitekt connection machinery.
vi.mock("./provider", () => ({ useServiceState: vi.fn() }));
vi.mock("./hooks", () => ({ useSelfService: vi.fn() }));

import { buildGuard } from "./index";
import { useServiceState } from "./provider";

const mockedUseServiceState = vi.mocked(useServiceState);

const Guard = buildGuard("mikro");

afterEach(() => {
  mockedUseServiceState.mockReset();
});

const renderGuard = () =>
  render(
    <Guard
      unavailable={<span>unavailable</span>}
      unconfigured={<span>unconfigured</span>}
      configuring={<span>configuring</span>}
      challenging={<span>challenging</span>}
    >
      <span>children</span>
    </Guard>,
  );

describe("buildGuard", () => {
  it("renders children only when the service is ready", () => {
    mockedUseServiceState.mockReturnValue({ status: "ready" } as never);
    renderGuard();
    expect(screen.getByText("children")).toBeInTheDocument();
    expect(screen.queryByText("unavailable")).not.toBeInTheDocument();
  });

  it("renders the unavailable fallback when there is no service state", () => {
    mockedUseServiceState.mockReturnValue(undefined as never);
    renderGuard();
    expect(screen.getByText("unavailable")).toBeInTheDocument();
    expect(screen.queryByText("children")).not.toBeInTheDocument();
  });

  it.each([
    ["unconfigured", "unconfigured"],
    ["invalid", "unconfigured"],
    ["configured", "configuring"],
    ["checking", "challenging"],
  ] as const)("maps status %s to the %s fallback", (status, expected) => {
    mockedUseServiceState.mockReturnValue({ status } as never);
    renderGuard();
    expect(screen.getByText(expected)).toBeInTheDocument();
    expect(screen.queryByText("children")).not.toBeInTheDocument();
  });

  it("falls back to null when a fallback prop is omitted", () => {
    mockedUseServiceState.mockReturnValue({ status: "checking" } as never);
    const { container } = render(
      <Guard>
        <span>children</span>
      </Guard>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
