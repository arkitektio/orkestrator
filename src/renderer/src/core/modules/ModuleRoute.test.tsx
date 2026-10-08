// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

// Services are ready when their key is in this set; the real guards read
// connection state, which a unit test does not have.
const ready = new Set<string>();
vi.mock("@/core/connection/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/connection/arkitekt/host")>()),
  serviceGuard:
    (key: string) =>
    ({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) =>
      ready.has(key) ? <>{children}</> : <>{fallback ?? null}</>,
}));
vi.mock("@/core/connection/arkitekt/hooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/connection/arkitekt/hooks")>()),
  useActiveProfile: () => null,
}));
vi.mock("@/core/layout/fallbacks/ServiceUnavailable", () => ({
  ServiceUnavailable: ({ serviceKey }: { serviceKey: string }) => <div>unavailable: {serviceKey}</div>,
}));

import { resetRoles, setRoleOverride } from "@/core/connection/roles";
import { ModuleRoute } from "./ModuleRoute";

const renderRoute = (props: { serviceKey?: string; roles?: string }) =>
  render(
    <MemoryRouter initialEntries={["/mikro/datasets/9"]}>
      <ModuleRoute {...props}>
        <div>the page</div>
      </ModuleRoute>
    </MemoryRouter>,
  );

/**
 * The host, not the module, stands between a route and a module's pages: the
 * role first, then the service, and only then the page (and its queries).
 */
describe("ModuleRoute", () => {
  afterEach(() => {
    ready.clear();
    resetRoles();
  });

  it("shows the page once the role and the service hold", () => {
    ready.add("mikro");
    setRoleOverride(["admin"]);
    renderRoute({ serviceKey: "mikro", roles: "admin" });
    expect(screen.getByText("the page")).toBeInTheDocument();
  });

  it("says the service is unavailable instead of mounting the page", () => {
    renderRoute({ serviceKey: "mikro" });
    expect(screen.getByText("unavailable: mikro")).toBeInTheDocument();
    expect(screen.queryByText("the page")).toBeNull();
  });

  it("says not permitted before it says anything about the service", () => {
    setRoleOverride(["member"]);
    renderRoute({ serviceKey: "mikro", roles: "admin" });
    expect(screen.getByRole("heading", { name: /needs the admin role/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Switch organization" })).toBeInTheDocument();
    expect(screen.queryByText("unavailable: mikro")).toBeNull();
  });

  it("stays quiet while the roles are not known yet", () => {
    ready.add("mikro");
    const { container } = renderRoute({ serviceKey: "mikro", roles: "admin" });
    expect(container).toBeEmptyDOMElement();
  });

  it("puts no service guard in front of the session's own module", () => {
    renderRoute({ serviceKey: "self" });
    expect(screen.getByText("the page")).toBeInTheDocument();
  });
});
