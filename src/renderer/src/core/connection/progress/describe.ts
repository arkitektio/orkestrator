import type { AliasFailure } from "@/core/connection/arkitekt/alias/resolve";
import type { ServiceHealthStatus } from "@/core/connection/arkitekt/types";
import type { AliasAttempt, MeshPhase, MeshProgress, SessionProgress, SessionStep } from "./store";

/**
 * The sentences every connection surface uses, in one place: what is being
 * tried, what answered, what is being waited on. Plain words, no status
 * enums, no codes.
 */

export const describeFailure = (failure: AliasFailure | undefined): string => {
  if (!failure) return "didn't answer";
  switch (failure.kind) {
    case "timeout":
      return `didn't answer within ${Math.round(failure.timeoutMs / 1000)} s`;
    case "unreachable":
      return "couldn't be reached";
    case "status":
      return `answered with an error (${failure.status})`;
  }
};

export const describeAttempt = (attempt: AliasAttempt): string => {
  const via = attempt.route === "mesh" ? " through the mesh" : "";
  switch (attempt.state) {
    case "trying":
      return `Trying ${attempt.host}${via}…`;
    case "ok":
      return `${attempt.host} answered${via}`;
    case "failed":
      return `${attempt.host} ${describeFailure(attempt.failure)}`;
  }
};

const MESH_PHASE: Record<MeshPhase, string> = {
  idle: "The mesh is about to start",
  firewall: "Windows is asking whether the mesh may accept incoming connections",
  "starting-client": "Starting the mesh client",
  joining: "Joining the mesh",
  "needs-machine-auth": "Waiting for an administrator to approve this computer on the mesh",
  "needs-login": "This computer's membership in the mesh has lapsed — sign in again to rejoin",
  running: "Connected to the mesh",
  unavailable: "This build can't start the mesh",
  failed: "The mesh couldn't start",
};

export const describeMesh = (mesh: MeshProgress): string => MESH_PHASE[mesh.phase];

/** Phases the mesh will not leave by itself: worth leading a failure with. */
export const meshIsStuck = (phase: MeshPhase): boolean =>
  phase === "needs-machine-auth" || phase === "needs-login" || phase === "unavailable" || phase === "failed";

export const meshIsWorking = (phase: MeshPhase): boolean =>
  phase === "idle" || phase === "firewall" || phase === "starting-client" || phase === "joining";

const SESSION_STEP: Record<SessionStep, (session: SessionProgress) => string> = {
  discover: (s) => (s.deployment ? `Finding ${s.deployment}` : "Finding the deployment"),
  register: (s) => (s.deployment ? `Registering this computer with ${s.deployment}` : "Registering this computer"),
  approve: () => "Approve the sign-in in your browser",
  finishing: () => "Finishing sign-in",
  refresh: (s) => (s.deployment ? `Signing in to ${s.deployment}` : "Signing in"),
  open: (s) => (s.deployment ? `Opening ${s.deployment}` : "Opening your workspace"),
};

export const describeSessionStep = (step: SessionStep, session: SessionProgress): string => SESSION_STEP[step](session);

/** The steps a bring-up of this kind goes through, in order. */
export const sessionSteps = (kind: SessionProgress["kind"]): SessionStep[] =>
  kind === "granting" ? ["discover", "register", "approve", "finishing", "open"] : ["refresh", "open"];

const SERVICE_STATUS: Record<ServiceHealthStatus, string> = {
  unconfigured: "Not part of this deployment",
  configured: "Waiting to be checked",
  checking: "Checking its addresses…",
  ready: "Connected",
  invalid: "Couldn't be reached",
};

/** A service's health in a few words; `revalidating` is a ready service being re-checked. */
export const describeServiceStatus = (status: ServiceHealthStatus, revalidating?: boolean): string =>
  status === "ready" && revalidating ? "Connected — checking again…" : SERVICE_STATUS[status];
