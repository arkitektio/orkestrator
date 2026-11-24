import type { ServiceRuntimeState } from "@/core/connection/arkitekt/types";
import type { ServiceRoute } from "@/core/connection/mesh/route";

/** A service's detail page under Settings → Hub. */
export const serviceLink = (key: string) => `/settings/hub/${encodeURIComponent(key)}`;

/**
 * The hub's services as the Hub page lists them: what the hub granted this app (and a required
 * one it did not, which is a problem to see), and the optional ones it did not grant, which are
 * no problem and go out of the way.
 */
export const splitServices = (services: readonly ServiceRuntimeState[]) => {
  const byName = (a: ServiceRuntimeState, b: ServiceRuntimeState) => a.key.localeCompare(b.key);
  const listed = services.filter((service) => service.configured || !service.definition.optional);
  const notGranted = services.filter((service) => !service.configured && service.definition.optional);
  return { listed: [...listed].sort(byName), notGranted: [...notGranted].sort(byName) };
};

/** The service's own words, when it has some. */
export const describeService = (service: ServiceRuntimeState): string | undefined =>
  typeof service.definition.description === "string" ? service.definition.description : undefined;

const WHERE: Record<"public" | "local" | "this-computer" | "vpn", string> = {
  public: "over the internet",
  local: "on the local network",
  "this-computer": "on this computer",
  vpn: "over a VPN",
};

/**
 * How this computer reaches a service, in one line: whether it is encrypted, and whether it goes
 * through the organisation's mesh (straight to the machine, or relayed) or directly.
 */
export const connectionProfile = (
  route: ServiceRoute,
  ssl: boolean,
): { line: string; tone: "good" | "warn" | "bad" } => {
  if (route.kind === "mesh") {
    // The mesh's tunnel is encrypted whatever the service's own scheme is.
    const peer = route.peer;
    if (peer && !peer.online) return { line: `Mesh · ${peer.name} is offline`, tone: "bad" };
    if (peer?.path?.kind === "direct") return { line: "Encrypted · mesh, direct tunnel", tone: "good" };
    if (peer?.path?.kind === "relay") {
      // The tunnel goes through a routing server (DERP), over TCP: it works, it is slower.
      return { line: `Encrypted · mesh, routed via ${peer.path.region}`, tone: "warn" };
    }
    return { line: "Encrypted · through the mesh", tone: "good" };
  }
  if (route.network === "mesh-down") {
    return { line: "On the mesh, which is not running here", tone: "bad" };
  }
  const where = WHERE[route.network];
  if (ssl) return { line: `Encrypted · direct ${where}`, tone: "good" };
  return { line: `Unencrypted · direct ${where}`, tone: route.network === "public" ? "bad" : "warn" };
};
