import { Arkitekt, Guard } from "@/app/Arkitekt";
import { toHubHealthFacts } from "@/lib/arkitekt/doctor/hubHealth";
import { useMyHubHealthLazyQuery } from "@/lok/api/graphql";
import { useCallback } from "react";
import { ConnectionDoctor, type ConnectionDoctorProps } from "./ConnectionDoctor";

/**
 * The doctor, plus the hub's own word about itself.
 *
 * The lok query must never mount without a lok client, so the guard wraps
 * the querying component from the OUTSIDE, and every fallback is the plain
 * doctor — which is still the whole point when nothing is connected.
 */

type HubAwareProps = Omit<ConnectionDoctorProps, "fetchHub">;

const WithHub = (props: HubAwareProps) => {
  const fakts = Arkitekt.useFakts();
  const [fetchHubHealth] = useMyHubHealthLazyQuery({ fetchPolicy: "network-only" });

  const fetchHub = useCallback(async () => {
    const { data } = await fetchHubHealth();
    const hub = data?.mycontext.hub;
    return hub ? toHubHealthFacts(hub, fakts?.instances ?? {}) : undefined;
  }, [fetchHubHealth, fakts]);

  return <ConnectionDoctor {...props} fetchHub={fetchHub} />;
};

export const HubAwareConnectionDoctor = (props: HubAwareProps) => {
  const plain = <ConnectionDoctor {...props} />;
  return (
    <Guard.Lok notConnectedFallback={plain} connectingFallback={plain} bootingFallback={plain}>
      <WithHub {...props} />
    </Guard.Lok>
  );
};
