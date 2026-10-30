import { Arkitekt, useCoordinationEndpoint } from "@/core/connection/arkitekt/host";
import { buildDeploymentDiagram } from "@/core/connection/arkitekt/doctor/diagram";
import type { HubHealthFacts } from "@/core/connection/arkitekt/doctor/hubHealth";
import type { ServiceRuntimeState } from "@/core/connection/arkitekt/types";
import { pathTitle } from "@/core/connection/mesh/connectionPath";
import { useConnectionPath } from "@/core/connection/mesh/useConnectionPath";
import { ConnectionDiagram } from "@/core/connection/ui/doctor/ConnectionDiagram";
import { useMemo } from "react";
import type { MeshStatusPayload } from "../../../../../main/mesh/protocol";

const hostOf = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
};

/**
 * The connection diagram for the whole deployment, on the Services page —
 * shown when a mesh is in play, because that is when "how does it get there"
 * has an answer worth drawing: each mesh address says whether its tunnel runs
 * direct or through a DERP relay, live.
 *
 * Same picture as the unreachable page (`ServiceUnavailable`), fed by live
 * state only: no probe runs just because Settings is open.
 */
export const DeploymentDiagram = ({
  services,
  hub,
  mesh,
}: {
  services: ServiceRuntimeState[];
  hub?: HubHealthFacts;
  mesh?: MeshStatusPayload;
}) => {
  const activeProfile = Arkitekt.useActiveProfile();
  const coordination = useCoordinationEndpoint();
  const path = useConnectionPath();

  const diagram = useMemo(
    () =>
      buildDeploymentDiagram({
        services,
        hub,
        mesh,
        coordination: { host: hostOf(coordination) },
        hubName: activeProfile?.label.hubName || activeProfile?.label.deploymentName,
        tunnel: path.kind === "direct" ? undefined : pathTitle(path),
      }),
    [services, hub, mesh, coordination, activeProfile, path],
  );

  // A mesh that is switched on but not carrying anything yet is still the
  // case to draw: that is exactly when its lines are the red ones. So is an
  // address on somebody else's mesh, which only this picture splits out.
  const usesMesh =
    path.kind === "arkitekt-mesh" ||
    !!activeProfile?.mesh?.enabled ||
    diagram.serviceLink.aliases.some((alias) => alias.lane === "mesh");
  if (!usesMesh) return null;

  return (
    <ConnectionDiagram
      diagram={diagram}
      className="rounded-lg border border-border/60 px-4 py-5"
    />
  );
};
