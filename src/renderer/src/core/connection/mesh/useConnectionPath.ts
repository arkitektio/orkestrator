import { useEffect, useMemo, useState } from "react";

import { Arkitekt } from "@/core/connection/arkitekt/host";
import type { VpnInterface } from "../../../../../main/doctor/protocol";
import { type ConnectionPath, summarizeConnectionPath } from "./connectionPath";
import { useMeshes } from "./useMeshes";

/** How often the tunnel interfaces are read again. */
const REFRESH_MS = 60_000;

const probeInterfaces = (): Promise<VpnInterface[]> => {
  const probe = typeof window === "undefined" ? undefined : window.api?.doctor?.probeInterfaces;
  return typeof probe === "function" ? probe().catch(() => []) : Promise.resolve([]);
};

/**
 * How this window reaches the active organization's services — see
 * `summarizeConnectionPath`. Mesh status is live (pushed by main); tunnel
 * interfaces are re-read on focus and every minute.
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

  const { payload } = useMeshes();
  const [vpn, setVpn] = useState<VpnInterface[]>([]);

  useEffect(() => {
    let live = true;
    const refresh = () => {
      void probeInterfaces().then((next) => live && setVpn(next));
    };
    refresh();
    const timer = window.setInterval(refresh, REFRESH_MS);
    window.addEventListener("focus", refresh);
    return () => {
      live = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return useMemo(
    () =>
      summarizeConnectionPath({
        hosts,
        mesh: payload,
        vpn,
      }),
    [hosts, payload, vpn],
  );
};
