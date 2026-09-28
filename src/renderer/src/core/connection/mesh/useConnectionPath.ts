import { useEffect, useMemo, useState } from "react";

import { Arkitekt } from "@/core/connection/arkitekt/host";
import { anyMeshHost } from "@/core/connection/arkitekt/doctor/classify";
import { doctorBridge } from "@/core/connection/arkitekt/doctor/useConnectionDoctor";
import type { MeshProbeResult, VpnInterface } from "../../../../../main/doctor/protocol";
import { type ConnectionPath, summarizeConnectionPath } from "./connectionPath";
import { useMeshes } from "./useMeshes";

/** How often the tunnel interfaces and the Tailscale CLI are asked again. */
const REFRESH_MS = 60_000;

/**
 * The Tailscale CLI spawns a process per call, so its answer is shared by
 * every caller in the window and asked at most once per `REFRESH_MS`.
 */
let tailscaleCache: { at: number; result: Promise<MeshProbeResult | undefined> } | undefined;

const probeTailscale = (): Promise<MeshProbeResult | undefined> => {
  const bridge = doctorBridge();
  if (!bridge) return Promise.resolve(undefined);
  const now = Date.now();
  if (!tailscaleCache || now - tailscaleCache.at > REFRESH_MS) {
    tailscaleCache = { at: now, result: bridge.probeMesh().catch(() => undefined) };
  }
  return tailscaleCache.result;
};

const probeInterfaces = (): Promise<VpnInterface[]> => {
  const probe = typeof window === "undefined" ? undefined : window.api?.doctor?.probeInterfaces;
  return typeof probe === "function" ? probe().catch(() => []) : Promise.resolve([]);
};

/**
 * How this window reaches the active organization's services — see
 * `summarizeConnectionPath`. Mesh status is live (pushed by main); tunnel
 * interfaces are re-read on focus and every minute; the Tailscale CLI is only
 * asked when a service sits at a tailnet-looking address in the first place.
 * In a browser build only the mesh half exists, so it reads `direct`.
 */
export const useConnectionPath = (): ConnectionPath => {
  const services = Arkitekt.useAvailableServices();
  const hostKey = services
    .map((service) => service.alias?.host)
    .filter((host): host is string => !!host)
    .sort()
    .join("\n");
  const hosts = useMemo(() => (hostKey ? hostKey.split("\n") : []), [hostKey]);

  const { sidecar, meshes } = useMeshes();
  const [vpn, setVpn] = useState<VpnInterface[]>([]);
  const [tailscale, setTailscale] = useState<MeshProbeResult | undefined>();

  const wantsTailscale = anyMeshHost(hosts);

  useEffect(() => {
    let live = true;
    const refresh = () => {
      void probeInterfaces().then((next) => live && setVpn(next));
      if (wantsTailscale) void probeTailscale().then((next) => live && setTailscale(next));
    };
    refresh();
    const timer = window.setInterval(refresh, REFRESH_MS);
    window.addEventListener("focus", refresh);
    return () => {
      live = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [wantsTailscale]);

  return useMemo(
    () =>
      summarizeConnectionPath({
        hosts,
        mesh: { sidecar, meshes },
        tailscale: wantsTailscale ? tailscale : undefined,
        vpn,
      }),
    [hosts, sidecar, meshes, tailscale, wantsTailscale, vpn],
  );
};
