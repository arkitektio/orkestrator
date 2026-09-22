import { useCallback, useRef, useState } from "react";
import type {
  MeshProbeResult,
  NetworkProbeResult,
  ProbeTarget,
  RemedyId,
  RemedyResult,
} from "../../../../../main/doctor/protocol";
import { DOCTOR_MAX_TARGETS } from "../../../../../main/doctor/protocol";
import type { MeshStatusPayload } from "../../../../../main/mesh/protocol";
import { meshBridge } from "@/lib/mesh/bridge";
import { anyMeshHost } from "./classify";
import { diagnose } from "./diagnose";
import type { DoctorContext, DoctorReport } from "./findings";

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
    const targets = input.targets.slice(0, DOCTOR_MAX_TARGETS);
    const bridge = doctorBridge();

    const finish = (
      network: NetworkProbeResult[],
      mesh: MeshProbeResult | undefined,
      probesAvailable: boolean,
      sidecar?: MeshStatusPayload,
    ) => {
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
        }),
        network,
        mesh,
        sidecar,
      });
      setStatus("done");
    };

    // No bridge: the address itself can still be classified, and saying "that
    // is a tailnet address" is worth more than saying nothing.
    if (!bridge) {
      finish([], undefined, false);
      return;
    }

    try {
      const wantsMesh = anyMeshHost(targets.map((target) => target.host));
      // The built-in mesh's state is cheap and local; a failure there must
      // not sink the whole run, so it degrades to "unknown".
      const sidecarStatus = meshBridge()?.status().catch(() => undefined) ?? Promise.resolve(undefined);
      const [network, mesh, sidecar] = await Promise.all([
        bridge.probeNetwork({ targets }),
        wantsMesh ? bridge.probeMesh() : Promise.resolve(undefined),
        sidecarStatus,
      ]);
      finish(network ?? [], mesh, true, sidecar);
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
