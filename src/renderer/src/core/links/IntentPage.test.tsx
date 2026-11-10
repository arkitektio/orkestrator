// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const profile = (id: string, org: string, services: string[] = ["kabinet"], roles?: string[]) => ({
  id,
  identity: { baseUrl: "https://go.arkitekt.live/lok", hubId: "3", organizationId: org },
  label: { organizationName: `${org} org`, roles },
  session: {
    endpoint: { base_url: "https://go.arkitekt.live/lok" },
    fakts: { instances: Object.fromEntries(services.map((key) => [key, { service: key }])) },
  },
});

const host = vi.hoisted(() => ({
  active: null as unknown,
  profiles: [] as unknown[],
  switchTo: vi.fn(),
  ready: true,
  serviceState: { configured: true, status: "ready" } as unknown,
}));

vi.mock("@/core/connection/arkitekt/host", () => ({
  Arkitekt: {
    useActiveProfile: () => host.active,
    useProfiles: () => host.profiles,
  },
  serviceGuard:
    () =>
    ({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) =>
      host.ready ? <>{children}</> : <>{fallback}</>,
}));
vi.mock("@/core/connection/arkitekt/hooks", () => ({ useServiceState: () => host.serviceState }));
vi.mock("@/core/connection/profile/ui/useSwitchToProfile", () => ({ useSwitchToProfile: () => host.switchTo }));
vi.mock("@/core/modules/host/host", () => ({ useModuleHostVersion: () => 0 }));
vi.mock("@/core/layout/fallbacks/statusActions", () => ({ BackButton: () => null, HomeButton: () => null }));
vi.mock("@/core/layout/fallbacks/NotPermitted", () => ({
  RoleRoute: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/core/layout/fallbacks/ServiceUnavailable", () => ({
  ServiceUnavailable: () => <span>service unreachable</span>,
}));
vi.mock("@/core/modules/registries", () => {
  // A stand-in for kabinet's parser: core tests import no module code.
  const parseRepoInstall = (params: URLSearchParams) => {
    const match = /^oci:(.+)$/.exec(params.get("source") ?? "");
    return match
      ? { ok: true as const, value: match[1] }
      : { ok: false as const, problem: "An install link names the app's published package, as source=oci:…" };
  };
  const intent: { roles?: string } & Record<string, unknown> = {
    name: "repo.install",
    version: 1,
    title: "Install a repository",
    picksOrganization: true,
    namespace: "kabinet",
    moduleLabel: "Kabinet",
    serviceKey: "kabinet",
    parse: parseRepoInstall,
    describe: (value: string) => value,
    target: (value: string) => `/kabinet/repos/install?reference=${encodeURIComponent(value)}`,
  };
  return { findIntent: (name: string) => (name === intent.name ? intent : undefined) };
});

import { consumePendingShare } from "@/core/tabs/pendingShare";
import { IntentPage } from "./IntentPage";

const Where = () => {
  const { pathname, search } = useLocation();
  return <span data-testid="where">{pathname + search}</span>;
};

const open = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="do/*" element={<IntentPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

const LINK = "/do/v1/repo.install?source=oci%3Aghcr.io%2Fjhnnsrs%2Fbasiks";
const TARGET = "/kabinet/repos/install?reference=ghcr.io%2Fjhnnsrs%2Fbasiks";

describe("IntentPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    host.active = profile("p-1", "my-lab");
    host.profiles = [host.active];
    host.ready = true;
    host.serviceState = { configured: true, status: "ready" };
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("forwards to the module's route with one login and the service ready", async () => {
    open(LINK);
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe(TARGET));
  });

  it("asks for a newer app on an unknown intent or a newer version, never a 404", () => {
    open("/do/v1/flow.deploy?id=1");
    expect(screen.getByText("This link needs a newer Orkestrator")).toBeTruthy();
    cleanup();
    open("/do/v2/repo.install?source=oci%3Aghcr.io%2Fa%2Fb");
    expect(screen.getByText("This link needs a newer Orkestrator")).toBeTruthy();
  });

  it("says what is wrong with the parameters", () => {
    open("/do/v1/repo.install?source=github%3Aa%2Fb");
    expect(screen.getByText(/names the app's published package/)).toBeTruthy();
  });

  it("says so when the path is not an intent link at all", () => {
    open("/do/repo.install");
    expect(screen.getByText("This link cannot be read")).toBeTruthy();
  });

  it("asks which organization with several logins, and continues in the active one", async () => {
    host.profiles = [host.active, profile("p-2", "other-lab")];
    open(LINK);
    expect(screen.getByText("Which organization should this go to?", { exact: false })).toBeTruthy();
    fireEvent.click(screen.getByText("Continue in my-lab org"));
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe(TARGET));
  });

  it("switches to another login with the choice remembered, so it is not asked again there", () => {
    host.profiles = [host.active, profile("p-2", "other-lab")];
    open(LINK);
    fireEvent.click(screen.getByText("other-lab org"));
    expect(host.switchTo).toHaveBeenCalledWith(expect.objectContaining({ id: "p-2" }));
    expect(consumePendingShare()).toBe(`${LINK}&in=p-2`);
  });

  it("does not ask again once the active login was picked", async () => {
    host.profiles = [host.active, profile("p-2", "other-lab")];
    open(`${LINK}&in=p-1`);
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe(TARGET));
  });

  it("does not ask when only one login could follow it", async () => {
    host.profiles = [host.active, profile("p-2", "other-lab", ["mikro"])];
    open(LINK);
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe(TARGET));
  });

  it("leaves out logins whose cached roles cannot follow it", async () => {
    host.profiles = [host.active, profile("p-2", "other-lab", ["kabinet"], ["guest"])];
    const restricted = vi.mocked(await import("@/core/modules/registries")).findIntent("repo.install")!;
    restricted.roles = "admin";
    try {
      open(LINK);
      await waitFor(() => expect(screen.getByTestId("where").textContent).toBe(TARGET));
    } finally {
      restricted.roles = undefined;
    }
  });

  it("names the missing module and offers only the logins that have it", () => {
    host.ready = false;
    host.serviceState = { configured: false, status: "unconfigured" };
    host.active = profile("p-1", "my-lab", ["mikro"]);
    host.profiles = [host.active, profile("p-2", "other-lab"), profile("p-3", "third-lab", ["mikro"])];
    open(LINK);
    expect(screen.getByText("my-lab org has no Kabinet")).toBeTruthy();
    expect(screen.queryByText("Which organization should this go to?", { exact: false })).toBeNull();
    expect(screen.getByText("other-lab org")).toBeTruthy();
    expect(screen.queryByText("third-lab org")).toBeNull();
    fireEvent.click(screen.getByText("other-lab org"));
    expect(consumePendingShare()).toBe(`${LINK}&in=p-2`);
  });

  it("offers no switch and says whom to ask when no login has the module", () => {
    host.ready = false;
    host.serviceState = { configured: false, status: "unconfigured" };
    host.active = profile("p-1", "my-lab", ["mikro"]);
    host.profiles = [host.active];
    open(LINK);
    expect(screen.getByText("Ask an admin to add Kabinet to the deployment.")).toBeTruthy();
  });

  it("shows the usual service page when the service is configured but not reachable", () => {
    host.ready = false;
    host.serviceState = { configured: true, status: "invalid" };
    open(LINK);
    expect(screen.getByText("service unreachable")).toBeTruthy();
  });
});
