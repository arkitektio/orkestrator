import { HubAwareConnectionDoctor } from "@/app/components/doctor/HubAwareConnectionDoctor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { aliasToHttpPath } from "@/lib/arkitekt/alias/helpers";
import { instanceToProbeTargets } from "@/lib/arkitekt/doctor/targets";
import {
  useArkitektStore,
  useAvailableServices,
  useServiceState,
} from "@/lib/arkitekt/hooks";
import { useActiveProfile } from "@/lib/arkitekt/hooks";
import { useArkitektActions } from "@/lib/arkitekt/provider";
import type { ServiceRuntimeState } from "@/lib/arkitekt/types";
import { Loader2, RefreshCw, Stethoscope, Unplug, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";

/**
 * What a module page shows when its backend service is not ready.
 *
 * Every module used to hand its guard `<>Loading</>` for all four non-ready
 * states, so a server that was DOWN — health check refused, service marked
 * `invalid` — looked exactly like one that was still being checked, forever.
 * This reads the service's own runtime state and says which it is: still
 * checking, unreachable (with the URL that was tried, the error, and a retry),
 * or simply not part of this deployment. When every configured service is
 * down it says so once, because that is a different problem (server, VPN)
 * than one module being off.
 */

/** Turn the browser's terse network errors into a sentence. */
const describeError = (error: string): string => {
  if (/failed to fetch|networkerror|network request failed|ERR_CONNECTION|ECONNREFUSED/i.test(error)) {
    return "No response from the server: the connection was refused or there is no network route to it.";
  }
  if (/timed? ?out|aborted/i.test(error)) {
    return "The server did not answer within the health-check timeout.";
  }
  return error;
};

const timeOf = (ms: number | undefined): string | null =>
  ms ? new Date(ms).toLocaleTimeString() : null;

export type ServiceStatusPanelProps = {
  serviceKey: string;
  state: ServiceRuntimeState | undefined;
  /**
   * The DEPLOYMENT these services belong to — not the coordination server.
   *
   * They are different machines and different failures: the coordination
   * server is where the login was granted, while the services run somewhere
   * else entirely (often a tailnet host), and that is what just failed to
   * answer. Naming the wrong one sends people off to debug a machine that is
   * working fine.
   */
  deployment?: { name?: string };
  /**
   * The host(s) the failing services actually live on, taken from the aliases
   * that were tried.
   *
   * It has to come from the aliases and nothing else. `fakts.self.alias` is
   * the app's OWN registration — it points at lok on the coordination server
   * — so using it printed "they run on go.arkitekt.live/lok, which is not the
   * server you signed in through", which is both wrong and self-contradictory.
   */
  hosts?: string[];
  /** Every configured service failed its health check, not just this one. */
  allDown: boolean;
  onRetry: () => Promise<void> | void;
  onRetryAll: () => Promise<void> | void;
  /**
   * Rendered beside Retry when the service is unreachable. A slot rather than
   * a prop of its own so this panel stays pure — retrying is something it can
   * do, diagnosing is something its caller wires up.
   */
  diagnoseAction?: React.ReactNode;
  /**
   * The diagnosis itself, once it has been asked for — rendered in place,
   * under the actions. It belongs on this page rather than in a sheet: the
   * user is already looking at the thing that failed.
   */
  diagnostics?: React.ReactNode;
};

/**
 * The pure panel: state in, page out. Kept free of the store so it can be
 * tested with plain props, and so the same copy could front any surface.
 */
export const ServiceStatusPanel = ({
  serviceKey,
  state,
  deployment,
  hosts,
  allDown,
  onRetry,
  onRetryAll,
  diagnoseAction,
  diagnostics,
}: ServiceStatusPanelProps) => {
  const [retrying, setRetrying] = useState(false);
  const name = state?.definition.name ?? serviceKey;
  const url = state?.alias ? aliasToHttpPath(state.alias, "") : null;
  const checkedAt = timeOf(state?.lastCheckedAt);

  const retry = async (all: boolean) => {
    setRetrying(true);
    try {
      await (all ? onRetryAll() : onRetry());
    } finally {
      setRetrying(false);
    }
  };

  let icon: React.ReactNode;
  let title: string;
  let body: React.ReactNode;
  let actions: React.ReactNode = null;
  let busy = false;

  if (!state || state.status === "unconfigured") {
    icon = <Unplug className="size-8 text-muted-foreground" aria-hidden />;
    title = `${name} is not part of this deployment`;
    body = (
      <p>
        {deployment?.name ? (
          <>The deployment <span className="font-medium">{deployment.name}</span> </>
        ) : (
          <>This deployment </>
        )}
        does not offer the <span className="font-mono">{serviceKey}</span> service, so this
        module has nothing to talk to.
      </p>
    );
  } else if (state.status === "configured" || state.status === "checking") {
    busy = true;
    icon = <Loader2 className="size-8 animate-spin text-primary motion-reduce:animate-none" aria-hidden />;
    title = state.status === "checking" ? `Checking ${name}` : `Connecting to ${name}`;
    body = url ? (
      <p>
        Waiting for <span className="font-mono">{url}</span> to answer.
      </p>
    ) : (
      <p>Waiting for the first health check.</p>
    );
  } else {
    // invalid
    icon = <WifiOff className="size-8 text-destructive" aria-hidden />;
    title = allDown
      ? deployment?.name
        ? `${deployment.name} is not reachable`
        : "This deployment is not reachable"
      : `${name} is not reachable`;
    body = (
      <div className="space-y-2">
        {allDown ? (
          <p>
            None of the services
            {deployment?.name ? (
              <> on <span className="font-medium">{deployment.name}</span></>
            ) : null}{" "}
            answered their health check.
            {hosts?.length === 1 ? (
              <>
                {" "}
                They run on <span className="font-mono">{hosts[0]}</span>.
              </>
            ) : null}{" "}
            That machine may be down, or this computer may need a VPN or mesh network to reach
            it.
          </p>
        ) : (
          <p>
            The {name} service failed its health check while the rest of this deployment
            answered, so this is about that one service rather than the network.
          </p>
        )}
        {state.errors.length > 0 && (
          <ul className="space-y-1">
            {[...new Set(state.errors)].map((error) => (
              <li key={error}>
                {describeError(error)}
                {describeError(error) !== error && (
                  <span className="ml-1 font-mono text-[11px] text-muted-foreground/70">({error})</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground/70">
          {url && (
            <>
              Tried <span className="font-mono">{url}</span>
            </>
          )}
          {url && checkedAt && " · "}
          {checkedAt && <>last checked {checkedAt}</>}
        </p>
      </div>
    );
    actions = (
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="sm" disabled={retrying} onClick={() => void retry(allDown)}>
          <RefreshCw className={retrying ? "mr-2 size-3.5 animate-spin" : "mr-2 size-3.5"} />
          {allDown ? "Retry all services" : `Retry ${name}`}
        </Button>
        {diagnoseAction}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={busy}
      className="flex h-full w-full flex-col items-center justify-center bg-radial-[at_100%_100%] from-background to-backgroundpaired px-4"
    >
      <div
        className={cn(
          "flex w-full flex-col items-center gap-4 text-center",
          diagnostics ? "max-w-2xl" : "max-w-md",
        )}
      >
        {icon}
        <h1 className="text-lg font-semibold">{title}</h1>
        <div className="text-sm text-muted-foreground">{body}</div>
        {actions}
        {/* The report keeps its own left-aligned text — findings are prose and
            read badly centred — but the block itself stays in the middle of
            the page with the rest of the message, not flush to one edge. */}
        {diagnostics && (
          <div className="mx-auto w-full max-w-xl pt-2 text-left">{diagnostics}</div>
        )}
      </div>
    </div>
  );
};

/** The connected fallback: give it the guard's service key. */
export const ServiceUnavailable = ({ serviceKey }: { serviceKey: string }) => {
  const state = useServiceState(serviceKey);
  const instance = useArkitektStore((state) => state.storedSession?.fakts.instances[serviceKey]);
  // Only the deployment's NAME comes from `self`. Its `alias` is the app's own
  // registration (lok on the coordination server), not where these services
  // run — see the `hosts` prop.
  const deploymentName = useArkitektStore(
    (state) => state.storedSession?.fakts.self?.deployment_name,
  );
  // Already only the configured ones: what this deployment actually offers.
  const configured = useAvailableServices();
  const { retryService } = useArkitektActions();
  const activeProfile = useActiveProfile();
  const [diagnosing, setDiagnosing] = useState(false);

  /**
   * The distinct hosts behind the services that are down — the addresses the
   * health checks actually went to. `instance.aliases` rather than
   * `state.alias`, because a service that never resolved has no chosen alias,
   * and that is exactly the case this message is for.
   */
  const hosts = useMemo(() => {
    const failing = configured.filter((service) => service.status === "invalid");
    return [
      ...new Set(
        failing.flatMap((service) =>
          (service.instance?.aliases ?? []).map((alias) => alias.host),
        ),
      ),
    ];
  }, [configured]);

  const allDown =
    state?.status === "invalid" &&
    configured.length > 1 &&
    configured.every((service) => service.status === "invalid");

  return (
    <ServiceStatusPanel
      serviceKey={serviceKey}
      state={state}
      deployment={{ name: deploymentName }}
      hosts={hosts}
      allDown={allDown}
      onRetry={() => retryService(serviceKey)}
      onRetryAll={async () => {
        await Promise.all(configured.map((service) => retryService(service.key)));
      }}
      diagnoseAction={
        // This is where "No working alias found" actually lands, so it is the
        // most useful place in the app to offer the doctor.
        state?.status === "invalid" && !diagnosing ? (
          <Button size="sm" variant="outline" onClick={() => setDiagnosing(true)}>
            <Stethoscope className="mr-2 size-3.5" />
            Run diagnostics
          </Button>
        ) : null
      }
      diagnostics={
        // Asked for, so it starts immediately and stays on this page: the
        // thing that failed is already on screen, and a sheet would cover it.
        diagnosing ? (
          <HubAwareConnectionDoctor
            autoRun
            centered
            context={{
              kind: "service",
              serviceKey,
              endpointUrl: activeProfile?.session.endpoint.base_url,
              // null = "the deployment names no mesh", a different verdict
              // from "unknown" — see DoctorContext.
              meshCoordUrl: activeProfile ? (activeProfile.session.endpoint.mesh_coord_url ?? null) : undefined,
              profileMesh: activeProfile?.mesh,
              coordinationAlias: activeProfile?.session.fakts.self.alias,
            }}
            buildTargets={() =>
              instance ? instanceToProbeTargets(serviceKey, instance) : []
            }
            originalError={state?.errors[0]}
            subject={state?.definition.name ?? serviceKey}
          />
        ) : null
      }
    />
  );
};
