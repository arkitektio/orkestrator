import { ConnectionDiagram } from "@/core/connection/ui/doctor/ConnectionDiagram";
import {
  CopyReportButton,
  FindingList,
  type ConnectionDoctorPanelProps,
} from "@/core/connection/ui/doctor/ConnectionDoctorPanel";
import { HubAwareConnectionDoctor } from "@/core/connection/ui/doctor/HubAwareConnectionDoctor";
import { Button } from "@/core/ui/button";
import { coordinationBase } from "@/core/connection/arkitekt/coordination";
import { buildConnectionDiagram } from "@/core/connection/arkitekt/doctor/diagram";
import { primaryFinding, type DoctorReport, type Finding } from "@/core/connection/arkitekt/doctor/findings";
import { instanceToProbeTargets } from "@/core/connection/arkitekt/doctor/targets";
import type { DoctorStatus } from "@/core/connection/arkitekt/doctor/useConnectionDoctor";
import {
  useArkitektStore,
  useAvailableServices,
  useServiceState,
} from "@/core/connection/arkitekt/hooks";
import { useActiveProfile } from "@/core/connection/arkitekt/hooks";
import { useArkitektActions } from "@/core/connection/arkitekt/provider";
import type { ServiceRuntimeState } from "@/core/connection/arkitekt/types";
import { pathTitle } from "@/core/connection/mesh/connectionPath";
import { useConnectionPath } from "@/core/connection/mesh/useConnectionPath";
import { useMeshes } from "@/core/connection/mesh/useMeshes";
import { anyMeshHost } from "@/core/connection/arkitekt/doctor/classify";
import {
  useSystemTailscale,
  useTailscaleConsent,
  type TailscaleConsent,
} from "@/core/connection/mesh/useSystemTailscale";
import type { MeshProbeResult } from "../../../../../main/doctor/protocol";
import type { MeshStatusPayload } from "../../../../../main/mesh/protocol";
import { Loader2, RefreshCw, Unplug } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * What a module page shows when its backend service is not ready.
 *
 * Every module used to hand its guard `<>Loading</>` for all four non-ready
 * states, so a server that was DOWN — health check refused, service marked
 * `invalid` — looked exactly like one that was still being checked, forever.
 * This reads the service's own runtime state and says which it is:
 *
 * - still trying its addresses: just "Connecting". No diagram, no alarm; most
 *   of the time this is on screen for a moment and then gone.
 * - every address failed: "Couldn't reach …", and now the picture — the
 *   coordination server, this computer and the hub, with what is broken red
 *   where it is broken (`ConnectionDiagram`). The connection doctor starts by
 *   itself ("Diagnosing…") and what it finds lands in the picture: on the
 *   part it is about, on hover, and in the copied report. Nothing is listed
 *   underneath; the one line under the heading is the likeliest reason.
 * - not part of this deployment: says so.
 */

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
  /** Every configured service failed its health check, not just this one. */
  allDown: boolean;
  onRetry: () => Promise<void> | void;
  onRetryAll: () => Promise<void> | void;
  /**
   * The coordination server, for the diagram's top corner ONLY. It is where
   * the login was granted and it is working, which is exactly why it is drawn
   * green and never named in the heading or the explanation.
   */
  coordination?: { name?: string; host?: string };
  /** The hub's name, for the diagram's right corner. */
  hubName?: string;
  /** "Arkitekt mesh · lab": the tunnel the services are reached through. */
  tunnel?: string;
  /** The live mesh status: how each address travels (relayed, direct tunnel). */
  mesh?: MeshStatusPayload;
  /**
   * The Tailscale the system runs (not the built-in mesh), once the user has
   * allowed asking it; `tailscaleConsent` says whether that is still an open
   * question, and `onTailscaleAnswer` takes the answer.
   */
  tailscale?: MeshProbeResult;
  tailscaleConsent?: TailscaleConsent;
  onTailscaleAnswer?: (allow: boolean, remember: boolean) => void;
  /**
   * The doctor's run, when there is one: it moves the break in the diagram
   * from "somewhere on the way" to the part that is actually at fault.
   */
  doctor?: { status: DoctorStatus; report?: DoctorReport; error?: string };
  /** Rows for a diagram part's findings; without it the parts do not expand. */
  renderFindings?: (findings: Finding[]) => React.ReactNode;
};

/**
 * The pure panel: state in, page out. Kept free of the store so it can be
 * tested with plain props, and so the same copy could front any surface.
 */
export const ServiceStatusPanel = ({
  serviceKey,
  state,
  deployment,
  allDown,
  onRetry,
  onRetryAll,
  coordination,
  hubName,
  tunnel,
  mesh,
  tailscale,
  tailscaleConsent,
  onTailscaleAnswer,
  doctor,
  renderFindings,
}: ServiceStatusPanelProps) => {
  const [retrying, setRetrying] = useState(false);
  const name = state?.definition.name ?? serviceKey;
  const checkedAt = timeOf(state?.lastCheckedAt);

  const retry = async (all: boolean) => {
    setRetrying(true);
    try {
      await (all ? onRetryAll() : onRetry());
    } finally {
      setRetrying(false);
    }
  };

  const page = (busy: boolean, children: React.ReactNode) => (
    <div
      role="status"
      aria-live="polite"
      aria-busy={busy}
      // Centred while it fits; once the diagram outgrows the tab it scrolls
      // from the top instead of being cut off at both ends (`my-auto` on the
      // column, rather than `justify-center` here).
      className="flex h-full w-full flex-col items-center overflow-y-auto bg-radial-[at_100%_100%] from-background to-backgroundpaired px-4"
    >
      <div className="my-auto flex w-full max-w-3xl flex-col items-center gap-4 py-6 text-center">{children}</div>
    </div>
  );

  if (!state || state.status === "unconfigured") {
    return page(
      false,
      <>
        <Unplug className="size-8 text-muted-foreground" aria-hidden />
        <h1 className="text-lg font-semibold">{name} is not part of this deployment</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {deployment?.name ? (
            <>The deployment <span className="font-medium">{deployment.name}</span> </>
          ) : (
            <>This deployment </>
          )}
          does not offer the <span className="font-mono">{serviceKey}</span> service, so this
          module has nothing to talk to.
        </p>
      </>,
    );
  }

  if (state.status !== "invalid") {
    // Still trying its addresses. Nothing has failed, so there is nothing to
    // draw and nothing to explain: this is usually gone in a moment.
    return page(
      true,
      <>
        <Loader2 className="size-6 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden />
        <h1 className="text-lg font-semibold">Connecting to {name}</h1>
      </>,
    );
  }

  // Every address failed. Only now the picture, and the doctor behind it.
  const diagram = buildConnectionDiagram({
    serviceKey,
    serviceName: name,
    status: state.status,
    errors: state.errors,
    aliases: state.instance?.aliases,
    chosenAlias: state.alias,
    coordination,
    hubName,
    tunnel,
    mesh,
    tailscale,
    tailscaleConsent,
    doctor,
  });
  const subject = allDown ? (deployment?.name ?? "this deployment") : name;
  const verdict = doctor?.report ? primaryFinding(doctor.report.findings) : undefined;
  // Until the doctor has looked, there is only half a picture — and one that
  // would change under the reader. So it waits ("Diagnosing…", in the room
  // the picture will take) and shows the tested one. Without a doctor at all
  // the live state is all there is, and that is drawn as it is.
  const diagnosing = !!doctor && (doctor.status === "idle" || doctor.status === "running");

  return page(
    diagnosing,
    <>
      {/* What happened first, then the looking into it, in the order they
          occur: the heading stays put while the picture arrives under it. */}
      <h1 className="text-lg font-semibold">Couldn&apos;t reach {subject}</h1>
      <ConnectionDiagram
        diagram={diagram}
        pending={diagnosing}
        renderFindings={renderFindings}
        onTailscaleAnswer={onTailscaleAnswer}
      />
      <div className="max-w-md space-y-1 text-sm text-muted-foreground">
        {diagnosing ? null : doctor?.status === "error" ? (
          <p>The diagnosis itself failed{doctor.error ? `: ${doctor.error}` : "."}</p>
        ) : verdict ? (
          // The likeliest reason, as one line. Everything else the check saw
          // is on the part it is about: hover it, or open the red one.
          <p>{verdict.title}</p>
        ) : null}
        {checkedAt && <p className="text-xs text-muted-foreground/70">Last checked {checkedAt}</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="sm" disabled={retrying} onClick={() => void retry(allDown)}>
          <RefreshCw className={retrying ? "mr-2 size-3.5 animate-spin" : "mr-2 size-3.5"} />
          {allDown ? "Retry all services" : `Retry ${name}`}
        </Button>
        {doctor?.report && !diagnosing && <CopyReportButton report={doctor.report} />}
      </div>
    </>,
  );
};

const hostOf = (endpointBaseUrl: string | undefined): string | undefined => {
  if (!endpointBaseUrl) return undefined;
  try {
    return new URL(coordinationBase(endpointBaseUrl)).host;
  } catch {
    return undefined;
  }
};

/** The page with a doctor's run in hand; everything the store knows is read here. */
const ConnectedPanel = ({ serviceKey, doctor }: { serviceKey: string; doctor: ConnectionDoctorPanelProps }) => {
  const state = useServiceState(serviceKey);
  // Only the deployment's NAME comes from `self`. Its `alias` is the app's own
  // registration (lok on the coordination server), not where these services
  // run — see the `hosts` prop.
  const deploymentName = useArkitektStore(
    (state) => state.storedSession?.fakts.self?.deployment_name,
  );
  const endpoint = useArkitektStore((state) => state.connection?.endpoint);
  // Already only the configured ones: what this deployment actually offers.
  const configured = useAvailableServices();
  const { retryService } = useArkitektActions();
  const activeProfile = useActiveProfile();
  const path = useConnectionPath();
  const { sidecar, meshes } = useMeshes();
  const mesh = useMemo(() => ({ sidecar, meshes }), [sidecar, meshes]);
  const tailscale = useSystemTailscale(
    anyMeshHost((state?.instance?.aliases ?? []).map((alias) => alias.host)),
  );

  const allDown =
    state?.status === "invalid" &&
    configured.length > 1 &&
    configured.every((service) => service.status === "invalid");

  // A health check that failed AGAIN (a retry, the mesh coming up) makes the
  // last report stale, so the doctor looks again. Only once a report exists:
  // the first failure is `autoRun`'s, and must not be probed twice. Probes
  // never write the store, so this cannot feed itself.
  const run = useRef(doctor.onRun);
  run.current = doctor.onRun;
  const hasReport = useRef(false);
  hasReport.current = !!doctor.report;
  const status = state?.status;
  const lastCheckedAt = state?.lastCheckedAt;
  // Being allowed to ask the system Tailscale is the same: what the last run
  // could not look at, the next one can.
  const consent = tailscale.consent;
  useEffect(() => {
    if (status === "invalid" && hasReport.current) run.current();
  }, [status, lastCheckedAt, consent]);

  return (
    <ServiceStatusPanel
      serviceKey={serviceKey}
      state={state}
      deployment={{ name: deploymentName }}
      allDown={allDown}
      onRetry={() => retryService(serviceKey)}
      onRetryAll={async () => {
        await Promise.all(configured.map((service) => retryService(service.key)));
      }}
      coordination={{ name: endpoint?.name, host: hostOf(endpoint?.base_url) }}
      hubName={activeProfile?.label.hubName || deploymentName}
      tunnel={path.kind === "direct" ? undefined : pathTitle(path)}
      mesh={mesh}
      tailscale={tailscale.status}
      tailscaleConsent={tailscale.consent}
      onTailscaleAnswer={tailscale.answer}
      doctor={{ status: doctor.status, report: doctor.report, error: doctor.error }}
      // What the doctor found about a part opens under the diagram when that
      // part is clicked, with whatever can be done about it.
      renderFindings={(findings) => <FindingList findings={findings} onRemedy={doctor.onRemedy} />}
    />
  );
};

/** The connected fallback: give it the guard's service key. */
export const ServiceUnavailable = ({ serviceKey }: { serviceKey: string }) => {
  const state = useServiceState(serviceKey);
  const instance = useArkitektStore((state) => state.storedSession?.fakts.instances[serviceKey]);
  const activeProfile = useActiveProfile();
  const { consent } = useTailscaleConsent();

  return (
    // This is where "No working alias found" actually lands, so the doctor
    // starts by itself the moment the service is known to be unreachable —
    // and not before: a service still being checked is not a failure yet.
    <HubAwareConnectionDoctor
      autoRun={state?.status === "invalid"}
      // Nobody asked for this run, so it does not read the system Tailscale
      // until the user has said it may (the diagram asks, once).
      systemMesh={consent === "allowed"}
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
      buildTargets={() => (instance ? instanceToProbeTargets(serviceKey, instance) : [])}
      originalError={state?.errors[0]}
      subject={state?.definition.name ?? serviceKey}
    >
      {(doctor) => <ConnectedPanel serviceKey={serviceKey} doctor={doctor} />}
    </HubAwareConnectionDoctor>
  );
};
