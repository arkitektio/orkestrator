import { useCallback, useRef, useState } from "react";
import type {
  MeshProbeResult,
  NetworkProbeResult,
  ProbeTarget,
  RemedyId,
  RemedyResult,
} from "../../../../../../main/doctor/protocol";
import { DOCTOR_MAX_TARGETS } from "../../../../../../main/doctor/protocol";
import type { MeshStatusPayload } from "../../../../../../main/mesh/protocol";
import { meshBridge } from "@/core/lib/mesh/bridge";
import { anyMeshHost } from "./classify";
import { diagnose } from "./diagnose";
import type { DoctorContext, DoctorReport, LokOutcome } from "./findings";
import type { HubHealthFacts } from "./hubHealth";
import { upstreamTargets } from "./targets";

/**
 * Orchestration only: ask main for the facts, hand them to the pure
 * `diagnose`, keep the result. Every judgement lives in `diagnose.ts`, so
 * there is nothing here worth testing beyond the wiring.
 */

export type DoctorStatus = "idle" | "running" | "done" | "error";

export type RunDoctorInput = {
  context: DoctorContext;
  targets: ProbeTarget[];
  /** The message the app already showed the user, if any. */
  originalError?: string;
  /** Did the app's own request fail? Lets us spot an app-side problem. */
  rendererReachable?: boolean;
  /**
   * The hub's own report, from lok. Only callers that HAVE a lok client pass
   * this (see `HubAwareConnectionDoctor`); the signed-out surfaces do not.
   */
  fetchHub?: () => Promise<HubHealthFacts | undefined>;
};

/** Lok is a witness, not a stage: slow or failing, it must not hold up the run. */
export const HUB_FETCH_TIMEOUT_MS = 5000;

export const fetchHubSafely = (fetchHub: RunDoctorInput["fetchHub"]): Promise<LokOutcome> => {
  if (!fetchHub) return Promise.resolve({ status: "not-available" });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<LokOutcome>((resolve) => {
    timer = setTimeout(() => resolve({ status: "timeout" }), HUB_FETCH_TIMEOUT_MS);
  });
  const asked = fetchHub().then(
    (hub): LokOutcome => (hub ? { status: "ok", hub } : { status: "no-hub" }),
    (cause): LokOutcome => ({ status: "failed", message: cause instanceof Error ? cause.message : String(cause) }),
  );
  return Promise.race([asked, timeout]).finally(() => clearTimeout(timer));
};

/**
 * Upstream hops plus a whole deployment can outgrow one call; main refuses
 * more than `DOCTOR_MAX_TARGETS`, so they go in batches rather than being
 * silently cut. The cap keeps a runaway fakts from turning into a scan.
 */
export const DOCTOR_TOTAL_TARGETS = 36;

export const probeInBatches = async (
  probeNetwork: DoctorBridge["probeNetwork"],
  targets: ProbeTarget[],
): Promise<NetworkProbeResult[]> => {
  const batches: ProbeTarget[][] = [];
  for (let start = 0; start < targets.length; start += DOCTOR_MAX_TARGETS) {
    batches.push(targets.slice(start, start + DOCTOR_MAX_TARGETS));
  }
  // In parallel: each batch waits out its own timeouts, and in sequence a
  // large deployment would take several times as long as a small one.
  const results = await Promise.all(batches.map((batch) => probeNetwork({ targets: batch })));
  return results.flatMap((result) => result ?? []);
};

type DoctorBridge = {
  probeNetwork: (request: { targets: ProbeTarget[]; timeoutMs?: number }) => Promise<NetworkProbeResult[]>;
  probeMesh: () => Promise<MeshProbeResult>;
  runRemedy: (id: RemedyId) => Promise<RemedyResult>;
};

/** Mirrors `voice/store.ts`: the bridge is absent in a browser build. */
export const doctorBridge = (): DoctorBridge | undefined => {
  if (typeof window === "undefined") return undefined;
  const bridge = window.api?.doctor;
  return typeof bridge?.probeNetwork === "function" ? bridge : undefined;
};

export const doctorAvailable = (): boolean => !!doctorBridge();

export const useConnectionDoctor = () => {
  const [status, setStatus] = useState<DoctorStatus>("idle");
  const [report, setReport] = useState<DoctorReport | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [remedyResult, setRemedyResult] = useState<RemedyResult | undefined>();
  // A second click while the first run is in flight would interleave two
  // reports; the newest run wins and the older one is dropped on arrival.
  const runIdRef = useRef(0);

  const run = useCallback(async (input: RunDoctorInput) => {
    const runId = ++runIdRef.current;
    setStatus("running");
    setError(undefined);
    setRemedyResult(undefined);

    const startedAt = Date.now();
    // The hops in front come first, so the cap can never cut them off.
    const targets = [...upstreamTargets(input.context), ...input.targets].slice(0, DOCTOR_TOTAL_TARGETS);
    const bridge = doctorBridge();

    const finish = (
      network: NetworkProbeResult[],
      mesh: MeshProbeResult | undefined,
      probesAvailable: boolean,
      sidecar?: MeshStatusPayload,
      lok: LokOutcome = { status: "not-available" },
    ) => {
      const hub = lok.status === "ok" ? lok.hub : undefined;
      if (runIdRef.current !== runId) return;
      setReport({
        startedAt,
        durationMs: Date.now() - startedAt,
        context: input.context,
        targets,
        findings: diagnose({
          context: input.context,
          targets,
          network,
          mesh,
          sidecar,
          originalError: input.originalError,
          rendererReachable: input.rendererReachable,
          probesAvailable,
          hub,
        }),
        network,
        mesh,
        sidecar,
        hub,
        lok,
      });
      setStatus("done");
    };

    // No bridge: the address itself can still be classified, and saying "that
    // is a tailnet address" is worth more than saying nothing.
    const lokOutcome = fetchHubSafely(input.fetchHub);

    if (!bridge) {
      finish([], undefined, false, undefined, await lokOutcome);
      return;
    }

    try {
      const wantsMesh = anyMeshHost(targets.map((target) => target.host));
      // The built-in mesh's state is cheap and local; a failure there must
      // not sink the whole run, so it degrades to "unknown".
      const sidecarStatus = meshBridge()?.status().catch(() => undefined) ?? Promise.resolve(undefined);
      const [network, mesh, sidecar, lok] = await Promise.all([
        probeInBatches(bridge.probeNetwork, targets),
        wantsMesh ? bridge.probeMesh() : Promise.resolve(undefined),
        sidecarStatus,
        lokOutcome,
      ]);
      finish(network, mesh, true, sidecar, lok);
    } catch (cause) {
      if (runIdRef.current !== runId) return;
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("error");
    }
  }, []);

  const runRemedy = useCallback(async (id: RemedyId): Promise<RemedyResult> => {
    const bridge = doctorBridge();
    if (!bridge) {
      const unavailable = { ok: false, message: "This build cannot apply fixes." };
      setRemedyResult(unavailable);
      return unavailable;
    }

    try {
      const result = await bridge.runRemedy(id);
      setRemedyResult(result);
      return result;
    } catch (cause) {
      const failed = {
        ok: false,
        message: cause instanceof Error ? cause.message : String(cause),
      };
      setRemedyResult(failed);
      return failed;
    }
  }, []);

  const reset = useCallback(() => {
    runIdRef.current++;
    setStatus("idle");
    setReport(undefined);
    setError(undefined);
    setRemedyResult(undefined);
  }, []);

  return {
    run,
    runRemedy,
    reset,
    status,
    running: status === "running",
    report,
    error,
    remedyResult,
    available: doctorAvailable(),
  };
};
