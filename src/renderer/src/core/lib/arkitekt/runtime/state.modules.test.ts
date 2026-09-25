import { describe, expect, it } from "vitest";

import { buildModuleStates, createModuleRegistryFromServices } from "./state";
import type { ServiceBuilderMap, ServiceHealthStatus, ServiceRuntimeState } from "../types";

const serviceBuilderMap = {
  mikro: { key: "mikro", service: "live.arkitekt.mikro", builder: () => ({ client: {} }) },
} as unknown as ServiceBuilderMap;

const registry = createModuleRegistryFromServices(serviceBuilderMap);

const mikroIs = (status: ServiceHealthStatus, errors: string[] = []) =>
  buildModuleStates(registry, {
    mikro: { key: "mikro", configured: true, status, errors } as unknown as ServiceRuntimeState,
  }).mikro;

describe("buildModuleStates", () => {
  it("is ready only when the service has a live client", () => {
    expect(mikroIs("ready").status).toBe("ready");
    expect(mikroIs("checking").status).toBe("checking");
  });

  it("an instance whose aliases all failed is invalid, not ready — its pane must not mount", () => {
    // The regression: every alias unreachable → no client in the service map,
    // yet the module read "ready" and the rail's hover card mounted mikro's
    // NavigationPane, whose query threw "Service mikro not found".
    const state = mikroIs("configured", ["No alias resolved for 'mikro'."]);
    expect(state.status).toBe("invalid");
    expect(state.errors).toEqual(["mikro: No alias resolved for 'mikro'."]);
  });

  it("hides a module whose service the deployment does not configure", () => {
    const state = buildModuleStates(registry, {
      mikro: { key: "mikro", configured: false, status: "unconfigured", errors: [] } as unknown as ServiceRuntimeState,
    }).mikro;
    expect(state.status).toBe("hidden");
  });
});
