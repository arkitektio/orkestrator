import { serviceGuard } from "@/core/connection/arkitekt/host";
import type { RoleRequirement } from "@/core/connection/roles";
import { ModuleLoadingFallback } from "@/core/layout/fallbacks/ModuleLoading";
import { RoleRoute } from "@/core/layout/fallbacks/NotPermitted";
import { ServiceUnavailable } from "@/core/layout/fallbacks/ServiceUnavailable";
import React, { type ReactNode } from "react";

const ServiceGate = ({ serviceKey, children }: { serviceKey: string; children: ReactNode }) => {
  const Guard = serviceGuard(serviceKey);
  return <Guard fallback={<ServiceUnavailable serviceKey={serviceKey} />}>{children}</Guard>;
};

/**
 * Everything between the router and a module's pages, in one place and one
 * order: the chunk, then the role, then the service.
 *
 * A module root is layout + routes; it does not guard itself. The host knows
 * the module's `serviceKey` and `roles` from its definition and mounts the
 * root only once both hold, so a module's queries never run without its
 * backend (CLAUDE.md §1) or for someone who may not see it (§6).
 *
 * The session is not checked here: the shell does not render routes without
 * one (`AppShell`).
 */
export const ModuleRoute = ({
  serviceKey,
  roles,
  children,
}: {
  /** The service the pages talk to; `"self"` (lok, the session) and none need no guard. */
  serviceKey?: string;
  roles?: RoleRequirement;
  children: ReactNode;
}) => (
  <React.Suspense fallback={<ModuleLoadingFallback />}>
    <RoleRoute roles={roles}>
      {serviceKey && serviceKey !== "self" ? <ServiceGate serviceKey={serviceKey}>{children}</ServiceGate> : children}
    </RoleRoute>
  </React.Suspense>
);

export default ModuleRoute;
