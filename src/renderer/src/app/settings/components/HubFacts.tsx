import { Guard } from "@/core/connection/arkitekt/host";
import { Arkitekt } from "@/core/connection/arkitekt/host";
import { toHubHealthFacts, type HubHealthFacts } from "@/core/connection/arkitekt/doctor/hubHealth";
import { useMyHubHealthQuery, useWatchHubHealthSubscription } from "@/lok/api/graphql";
import { useEffect, type ReactNode } from "react";

type Render = (hub: HubHealthFacts | undefined) => ReactNode;

/** Only mounted under `Guard.Lok`: the hub's report, live. */
const WithHub = ({ children }: { children: Render }) => {
  const fakts = Arkitekt.useFakts();
  const { data, refetch } = useMyHubHealthQuery();
  const raw = data?.mycontext.hub;
  // Each report arrives as it is made (`hubHealth`, normalized into the cache).
  useWatchHubHealthSubscription({ variables: { hub: raw?.id ?? null }, skip: !raw });
  // A hub that goes quiet sends nothing: read it again when it would stop
  // counting as online (`offlineAt`), so "offline" shows without a poll.
  const offlineAt = raw?.offlineAt;
  useEffect(() => {
    if (!offlineAt) return undefined;
    const wait = new Date(offlineAt).getTime() - Date.now() + 1_000;
    if (wait <= 0) return undefined;
    const timer = window.setTimeout(() => void refetch(), wait);
    return () => window.clearTimeout(timer);
  }, [offlineAt, refetch]);
  return <>{children(raw ? toHubHealthFacts(raw, fakts?.instances ?? {}) : undefined)}</>;
};

/**
 * The hub's own report about itself and its services, for what renders it: `undefined` while
 * there is no lok client (or the hub does not report). The query never mounts without lok.
 */
export const HubFacts = ({ children }: { children: Render }) => {
  const plain = <>{children(undefined)}</>;
  return (
    <Guard.Lok notConnectedFallback={plain} connectingFallback={plain} bootingFallback={plain}>
      <WithHub>{children}</WithHub>
    </Guard.Lok>
  );
};
