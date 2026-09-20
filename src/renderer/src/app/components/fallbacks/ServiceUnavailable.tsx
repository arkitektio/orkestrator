import { Button } from "@/components/ui/button";
import { aliasToHttpPath } from "@/lib/arkitekt/alias/helpers";
import { useActiveProfile, useAvailableServices, useServiceState } from "@/lib/arkitekt/hooks";
import { useArkitektActions } from "@/lib/arkitekt/provider";
import type { ServiceRuntimeState } from "@/lib/arkitekt/types";
import { Loader2, RefreshCw, Unplug, WifiOff } from "lucide-react";
import { useState } from "react";

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
  /** The coordination server the profile signed in against, for context. */
  baseUrl?: string;
  /** Every configured service failed its health check, not just this one. */
  allDown: boolean;
  onRetry: () => Promise<void> | void;
  onRetryAll: () => Promise<void> | void;
};

/**
 * The pure panel: state in, page out. Kept free of the store so it can be
 * tested with plain props, and so the same copy could front any surface.
 */
export const ServiceStatusPanel = ({
  serviceKey,
  state,
  baseUrl,
  allDown,
  onRetry,
  onRetryAll,
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
        {baseUrl ? <>The server at <span className="font-mono">{baseUrl}</span> </> : <>This server </>}
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
    title = allDown ? "The server is not reachable" : `${name} is not reachable`;
    body = (
      <div className="space-y-2">
        {allDown ? (
          <p>
            None of the services{baseUrl ? <> at <span className="font-mono">{baseUrl}</span></> : null} answered
            their health check. The server may be down, or this machine may need a VPN or network
            connection to reach it.
          </p>
        ) : (
          <p>
            The {name} service failed its health check while the rest of the server answered.
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
      <div className="flex gap-2">
        <Button size="sm" disabled={retrying} onClick={() => void retry(allDown)}>
          <RefreshCw className={retrying ? "mr-2 size-3.5 animate-spin" : "mr-2 size-3.5"} />
          {allDown ? "Retry all services" : `Retry ${name}`}
        </Button>
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
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        {icon}
        <h1 className="text-lg font-semibold">{title}</h1>
        <div className="text-sm text-muted-foreground">{body}</div>
        {actions}
      </div>
    </div>
  );
};

/** The connected fallback: give it the guard's service key. */
export const ServiceUnavailable = ({ serviceKey }: { serviceKey: string }) => {
  const state = useServiceState(serviceKey);
  // Already only the configured ones: what this deployment actually offers.
  const configured = useAvailableServices();
  const profile = useActiveProfile();
  const { retryService } = useArkitektActions();

  const allDown =
    state?.status === "invalid" &&
    configured.length > 1 &&
    configured.every((service) => service.status === "invalid");

  return (
    <ServiceStatusPanel
      serviceKey={serviceKey}
      state={state}
      baseUrl={profile?.session.endpoint.base_url}
      allDown={allDown}
      onRetry={() => retryService(serviceKey)}
      onRetryAll={async () => {
        await Promise.all(configured.map((service) => retryService(service.key)));
      }}
    />
  );
};
