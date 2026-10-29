import { ConnectionDiagram, DiagramLegend, TailscaleQuestion } from "@/core/connection/ui/doctor/ConnectionDiagram";
import {
  CopyReportButton,
  FindingList,
  RemedyButton,
  type ConnectionDoctorPanelProps,
} from "@/core/connection/ui/doctor/ConnectionDoctorPanel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/core/ui/collapsible";
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
import { ChevronDown, Loader2, RefreshCw, Stethoscope, Unplug, Waypoints, Wrench } from "lucide-react";
import { cn } from "@/core/util/utils";
import { ConnectionSteps } from "@/core/connection/ui/progress/ConnectionSteps";
import { serviceSteps } from "@/core/connection/ui/progress/serviceSteps";
import { describeMesh, meshIsStuck } from "@/core/connection/progress/describe";
import type { MeshProgress, ServiceProgress } from "@/core/connection/progress/store";
import { useMeshProgress, useServiceProgress } from "@/core/connection/progress/hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { CopyDetailsButton, StatusPage, statusCopyText, type StatusDetail } from "./StatusPage";
import { BackButton, HomeButton, MeshSettingsButton } from "./statusActions";

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
 * - every address failed: "Couldn't reach …". The connection doctor starts by
 *   itself ("Diagnosing…") and the page then says ONE thing: the likeliest
 *   reason under the heading, what to try as the hints, Retry and the report
 *   to copy. The picture — coordination server, this computer, the hub, red
 *   where it is broken (`ConnectionDiagram`) — is folded away, with the
 *   facts and the raw error, behind "Technical details".
 * - not part of this deployment: says so.
 */

/** The column the page's cards share: wider than the text, narrower than the map. */
const CARD = "w-[min(36rem,calc(100cqw-2rem))] text-left";

/**
 * What the doctor is looking at while it runs. Not a progress bar: the probes
 * run at once and report together, so this says WHAT is being checked, which
 * is the honest part, and spins until the answer is in.
 */
const Investigating = ({ name, addresses }: { name: string; addresses: string[] }) => (
  <div className={cn(CARD, "rounded-xl border border-primary/30 bg-primary/5 p-4")}>
    <div className="flex items-center gap-2 text-sm font-semibold">
      <Loader2 className="size-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
      Investigating what is wrong…
    </div>
    <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
      <li className="flex items-start gap-2">
        <span aria-hidden className="mt-[0.5em] size-1.5 shrink-0 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
        <span>
          {addresses.length === 1
            ? `The address ${name} advertises`
            : `The ${addresses.length > 1 ? `${addresses.length} ` : ""}addresses ${name} advertises`}
          {addresses.length > 0 && (
            <span className="mt-1 flex flex-wrap gap-1">
              {addresses.map((address) => (
                <code key={address} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                  {address}
                </code>
              ))}
            </span>
          )}
        </span>
      </li>
      <li className="flex items-start gap-2">
        <span aria-hidden className="mt-[0.5em] size-1.5 shrink-0 animate-pulse rounded-full bg-primary [animation-delay:300ms] motion-reduce:animate-none" />
        The network and mesh software on this computer
      </li>
      <li className="flex items-start gap-2">
        <span aria-hidden className="mt-[0.5em] size-1.5 shrink-0 animate-pulse rounded-full bg-primary [animation-delay:600ms] motion-reduce:animate-none" />
        The hub's own report about itself
      </li>
    </ul>
  </div>
);

/**
 * What the investigation concluded, on top: the likeliest reason, why we
 * think so, and — numbered, because they are tried in order — what to do.
 */
const Diagnosis = ({ verdict, steps }: { verdict: Finding; steps: string[] }) => (
  <section
    aria-label="Most likely reason"
    className={cn(CARD, "overflow-hidden rounded-xl border border-destructive/40 bg-destructive/5")}
  >
    <div className="p-4">
      <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-destructive">
        <Stethoscope className="size-3.5" aria-hidden />
        Most likely reason
      </div>
      <p className="text-base font-semibold leading-snug text-foreground">{verdict.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{verdict.detail}</p>
    </div>
    {steps.length > 0 && (
      <div aria-label="What you can try" role="region" className="border-t border-destructive/20 bg-background/40 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-destructive">
          <Wrench className="size-3.5" aria-hidden />
          What you can try
        </div>
        <ol className="space-y-2.5">
          {steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3 text-sm leading-relaxed text-foreground">
              <span
                aria-hidden
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-destructive text-xs font-semibold text-white"
              >
                {index + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    )}
  </section>
);

/** How long an unreachable service waits before it is tried again by itself. */
export const AUTO_RETRY_SECONDS = 60;

/**
 * Counts down to the next automatic retry while `enabled`, and fires `run` at
 * zero. Starts over whenever it is (re-)enabled or `restart` is called — a
 * manual retry is a retry, so the next automatic one is a full minute later.
 */
const useAutoRetry = (enabled: boolean, run: () => void) => {
  const [left, setLeft] = useState(AUTO_RETRY_SECONDS);
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    if (!enabled) return;
    setLeft(AUTO_RETRY_SECONDS);
    const id = setInterval(() => setLeft((current) => Math.max(0, current - 1)), 1000);
    return () => clearInterval(id);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || left > 0) return;
    setLeft(AUTO_RETRY_SECONDS);
    runRef.current();
  }, [enabled, left]);

  return { left, restart: () => setLeft(AUTO_RETRY_SECONDS) };
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
  /** Ways out when there is nothing to retry (the service is not installed). */
  leaveActions?: React.ReactNode;
  /** The check as it runs: each address tried, and whether it waits on the mesh. */
  progress?: ServiceProgress;
  /** The active profile's mesh, as the progress store tells it. */
  meshProgress?: MeshProgress;
  /** The way to the mesh's settings, for when the mesh is what is stuck. */
  meshAction?: React.ReactNode;
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
  leaveActions,
  progress,
  meshProgress,
  meshAction,
}: ServiceStatusPanelProps) => {
  const [retrying, setRetrying] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);
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
  // Hooks before the early returns. Only an unreachable service retries by
  // itself, and not while a retry or the diagnosis is already running.
  const autoRetry = useAutoRetry(
    state?.status === "invalid" && !retrying && !(doctor && (doctor.status === "idle" || doctor.status === "running")),
    () => void retry(allDown),
  );

  const facts: StatusDetail[] = [{ label: "Service", value: serviceKey, mono: true }];
  if (hubName && hubName !== deployment?.name) facts.push({ label: "Hub", value: hubName });

  if (!state || state.status === "unconfigured") {
    return (
      <StatusPage
        busy={false}
        icon={Unplug}
        eyebrow="Not installed"
        title={`${name} is not part of this deployment`}
        description={
          <>
            {deployment?.name ? (
              <>The deployment <span className="font-medium">{deployment.name}</span> </>
            ) : (
              <>This deployment </>
            )}
            does not offer the <span className="font-mono">{serviceKey}</span> service, so this
            module has nothing to talk to.
          </>
        }
        hints={[
          <>Another organization or hub may run it: switch from the account menu in the sidebar.</>,
          <>Whoever runs this deployment can add the service to it.</>,
        ]}
        actions={leaveActions}
        details={facts}
      />
    );
  }

  if (state.status !== "invalid") {
    // Still trying its addresses. Usually gone in a moment, so the rows say
    // only what is being tried — and, when it is, that the mesh is awaited.
    const steps = serviceSteps({ progress, mesh: meshProgress, meshAction });
    return (
      <StatusPage busy icon={Loader2} spin title={`Connecting to ${name}`}>
        {steps.length > 0 && <ConnectionSteps steps={steps} className="w-[min(28rem,calc(100cqw-2rem))]" />}
      </StatusPage>
    );
  }

  const verdict = doctor?.report ? primaryFinding(doctor.report.findings) : undefined;
  // The mesh is what failed, for a reason the user can act on: that leads,
  // ahead of the general "couldn't reach" — unless the doctor found something
  // else at fault (a server that refuses is not fixed by the mesh).
  const meshStuck =
    !!meshProgress &&
    meshIsStuck(meshProgress.phase) &&
    !!progress?.attempts.some((attempt) => attempt.route === "mesh") &&
    (!verdict || verdict.id.startsWith("mesh."));

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
  // Until the doctor has looked, there is only half a picture — and one that
  // would change under the reader. So it says "Diagnosing…" and offers no
  // map. Without a doctor at all the live state is all there is.
  const diagnosing = !!doctor && (doctor.status === "idle" || doctor.status === "running");
  // The one question worth asking on the page itself: an address only a
  // Tailscale the app does not run can explain, while nothing else does.
  const askTailscale =
    !diagnosing && !!onTailscaleAnswer && !!diagram.serviceLink.askTailscale && verdict?.id !== "service.not-running";
  // The investigated reason leads the page; the mesh's own, when that is
  // what is stuck, stays the one line under the heading instead.
  const diagnosed = verdict && !meshStuck && !diagnosing && doctor?.status !== "error" ? verdict : undefined;
  const addresses = (state.instance?.aliases ?? []).map(
    (alias) => `${alias.host}${alias.port ? `:${alias.port}` : ""}`,
  );
  // The verdict's own way out, as a button. A manual one is already a hint,
  // and one that runs a command answers in the doctor's panel, which this
  // page does not have, so neither is offered here.
  const remedy =
    verdict?.remedy && !meshStuck && !diagnosing && verdict.remedy.kind !== "manual" && verdict.remedy.kind !== "run"
      ? verdict.remedy
      : undefined;

  if (deployment?.name && !allDown) facts.push({ label: "Deployment", value: deployment.name });
  if (state.alias) {
    facts.push({ label: "Address", value: `${state.alias.host}${state.alias.port ? `:${state.alias.port}` : ""}`, mono: true });
  }
  if (checkedAt) facts.push({ label: "Last checked", value: checkedAt });
  const technical = state.errors.length > 0 ? state.errors.join("\n") : null;

  return (
    <StatusPage
      busy={diagnosing}
      tone="destructive"
      icon={Unplug}
      eyebrow="Unreachable"
      // What happened first, then the looking into it, in the order they
      // occur: the heading stays put while the picture arrives under it.
      title={`Couldn't reach ${subject}`}
      description={
        meshStuck ? (
          `${describeMesh(meshProgress)}.`
        ) : diagnosing ? (
          "Looking into why, this takes a few seconds."
        ) : doctor?.status === "error" ? (
          <>The diagnosis itself failed{doctor.error ? `: ${doctor.error}` : "."}</>
        ) : diagnosed && doctor?.report ? (
          // The reason itself is the card below; this says it was looked into.
          `Investigated ${doctor.report.targets.length} ${doctor.report.targets.length === 1 ? "address" : "addresses"} in ${(doctor.report.durationMs / 1000).toFixed(1)}s.`
        ) : null
      }
    >
      {diagnosing && <Investigating name={name} addresses={addresses} />}
      {diagnosed && <Diagnosis verdict={diagnosed} steps={diagnosed.steps ?? []} />}
      {askTailscale && (
        <div className={CARD}>
          <TailscaleQuestion onAnswer={onTailscaleAnswer!} />
        </div>
      )}

      {/* The actions under the steps they act on, not under the map. */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          size="lg"
          disabled={retrying}
          onClick={() => {
            autoRetry.restart();
            void retry(allDown);
          }}
        >
          <RefreshCw className={retrying ? "animate-spin motion-reduce:animate-none" : undefined} />
          {allDown ? "Retry all services" : `Retry ${name}`}
        </Button>
        {meshStuck && meshAction}
        {remedy && <RemedyButton remedy={remedy} onRemedy={() => {}} />}
        {doctor?.report && !diagnosing && <CopyReportButton report={doctor.report} />}
      </div>
      {!diagnosing && (
        <div className={cn(CARD, "-mt-3 space-y-1.5")} aria-live="off">
          <p className="text-center text-xs text-muted-foreground">
            {retrying ? "Retrying…" : `Retrying automatically in ${autoRetry.left}s`}
          </p>
          <div className="mx-auto h-0.5 w-40 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-destructive/60 transition-[width] duration-1000 ease-linear"
              style={{ width: `${retrying ? 100 : ((AUTO_RETRY_SECONDS - autoRetry.left) / AUTO_RETRY_SECONDS) * 100}%` }}
            />
          </div>
        </div>
      )}

      {!diagnosing && (
        <Collapsible
          open={showTechnical}
          onOpenChange={setShowTechnical}
          // Wider than the column of text once open: the map needs the room.
          className={cn(
            "overflow-hidden rounded-xl border bg-card/60 text-left backdrop-blur-sm",
            showTechnical ? "w-[min(48rem,calc(100cqw-2rem))]" : CARD,
          )}
        >
          <div className="flex items-center hover:bg-muted/40">
            <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Waypoints className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Technical details</span>
                <span className="block text-xs text-muted-foreground">
                  The connection map, the addresses tried and the raw error
                </span>
              </span>
              <ChevronDown
                className={cn("size-4 text-muted-foreground transition-transform", showTechnical && "rotate-180")}
                aria-hidden
              />
            </CollapsibleTrigger>
            {showTechnical && (
              <CopyDetailsButton text={() => statusCopyText({ title: `Couldn't reach ${subject}`, details: facts, technical })} />
            )}
          </div>
          <CollapsibleContent className="border-t">
            <div
              className="px-3 pt-3 pb-4"
              // A faint dot grid: reads as a canvas, not as another card.
              style={{
                backgroundImage: "radial-gradient(circle, color-mix(in oklab, var(--muted-foreground) 18%, transparent) 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            >
              <ConnectionDiagram
                // The question is asked on the page, not again in the picture.
                diagram={{ ...diagram, serviceLink: { ...diagram.serviceLink, askTailscale: false } }}
                renderFindings={renderFindings}
              />
              <DiagramLegend className="mt-2 justify-center" />
              {renderFindings && (
                <p className="mt-1 text-center text-[11px] text-muted-foreground/70">
                  Hover a part for what was checked there; click a red one for what was found.
                </p>
              )}
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t px-4 py-3 text-sm">
              {facts.map((fact) => (
                <div key={fact.label} className="contents">
                  <dt className="whitespace-nowrap text-muted-foreground">{fact.label}</dt>
                  <dd className={cn("min-w-0 break-all", fact.mono && "font-mono text-xs leading-5")}>{fact.value}</dd>
                </div>
              ))}
            </dl>
            {technical && (
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all border-t bg-muted/40 px-4 py-3 font-mono text-xs leading-5">
                {technical}
              </pre>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </StatusPage>
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
  const progress = useServiceProgress(serviceKey);
  const meshProgress = useMeshProgress();
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
      progress={progress}
      meshProgress={meshProgress}
      meshAction={<MeshSettingsButton />}
      leaveActions={
        <>
          <BackButton />
          <HomeButton />
        </>
      }
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
