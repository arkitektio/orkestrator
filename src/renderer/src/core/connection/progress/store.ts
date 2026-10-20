import type { AliasFailure } from "@/core/connection/arkitekt/alias/resolve";

/**
 * What connecting is doing right now, for the surfaces that explain it: the
 * connecting screen, a service page still trying its addresses, the sign-in
 * steps. One window, one picture.
 *
 * It only NARRATES. Nothing reads it to decide anything — the provider, the
 * alias walk and the mesh gate stay the source of truth, and write here as
 * they go. Kept out of the arkitekt store on purpose: an alias probe lands
 * every few hundred milliseconds during a launch, and every `useArkitekt`
 * subscriber would re-render for each one.
 */

export type AliasAttempt = {
  host: string;
  route: "direct" | "mesh";
  state: "trying" | "ok" | "failed";
  failure?: AliasFailure;
  at: number;
};

export type ServiceProgress = {
  key: string;
  /** The provider's check run; a stale run's writes are dropped. */
  run: number;
  startedAt: number;
  attempts: AliasAttempt[];
  /** The walk is waiting for the mesh before it tries the addresses behind it. */
  waitingForMesh: boolean;
};

/**
 * Where the active profile's mesh is, in the words the user needs:
 * `firewall` while Windows' explainer is up, `starting-client` while the
 * sidecar spawns, `joining` while the node logs in, then where it ended.
 */
export type MeshPhase =
  | "idle"
  | "firewall"
  | "starting-client"
  | "joining"
  | "needs-machine-auth"
  | "needs-login"
  | "running"
  | "unavailable"
  | "failed";

export type MeshProgress = {
  meshId: string;
  label: string;
  phase: MeshPhase;
  since: number;
  /** Who asked for it: service keys, `"self"` for sign-in, `"join"` for a grant. */
  demandedBy: string[];
  /** The node's own words, when it failed. */
  detail?: string;
};

export type SessionStep =
  | "discover"
  | "register"
  | "approve"
  | "finishing"
  | "refresh"
  | "open";

export type SessionProgress = {
  kind: "booting" | "switching" | "granting";
  step: SessionStep;
  startedAt: number;
  /** When the step started; `startedAt` is the whole bring-up's. */
  stepSince: number;
  deployment?: string;
  profileLabel?: string;
  /** The coordination server this bring-up talks to, for the doctor. */
  endpointUrl?: string;
};

export type ConnectionProgress = {
  session?: SessionProgress;
  services: Record<string, ServiceProgress>;
  mesh?: MeshProgress;
};

const EMPTY: ConnectionProgress = { services: {} };

let state: ConnectionProgress = EMPTY;
const listeners = new Set<() => void>();

const set = (next: ConnectionProgress) => {
  if (next === state) return;
  state = next;
  listeners.forEach((listener) => listener());
};

export const connectionProgress = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: (): ConnectionProgress => state,
};

/* ─────────────────────────────── session ──────────────────────────────── */

export const startSession = (
  kind: SessionProgress["kind"],
  step: SessionStep,
  labels: Pick<SessionProgress, "deployment" | "profileLabel" | "endpointUrl"> = {},
) => {
  const now = Date.now();
  set({ ...state, session: { kind, step, startedAt: now, stepSince: now, ...labels } });
};

/** Moves the running bring-up on; a no-op when none is running. */
export const sessionStep = (
  step: SessionStep,
  labels: Pick<SessionProgress, "deployment" | "profileLabel" | "endpointUrl"> = {},
) => {
  const session = state.session;
  if (!session || (session.step === step && Object.keys(labels).length === 0)) return;
  set({ ...state, session: { ...session, ...labels, step, stepSince: session.step === step ? session.stepSince : Date.now() } });
};

export const endSession = () => {
  if (state.session) set({ ...state, session: undefined });
};

/* ─────────────────────────────── services ─────────────────────────────── */

export const startServiceCheck = (key: string, run: number) => {
  set({ ...state, services: { ...state.services, [key]: { key, run, startedAt: Date.now(), attempts: [], waitingForMesh: false } } });
};

const patchService = (key: string, run: number, patch: (current: ServiceProgress) => ServiceProgress) => {
  const current = state.services[key];
  if (!current || current.run !== run) return;
  set({ ...state, services: { ...state.services, [key]: patch(current) } });
};

/** A probe started or ended; an ending one replaces its own "trying" row. */
export const recordAttempt = (key: string, run: number, attempt: Omit<AliasAttempt, "at">) =>
  patchService(key, run, (current) => {
    const row: AliasAttempt = { ...attempt, at: Date.now() };
    const last = current.attempts[current.attempts.length - 1];
    const replacesTrying = attempt.state !== "trying" && last?.state === "trying" && last.host === attempt.host;
    return {
      ...current,
      attempts: replacesTrying ? [...current.attempts.slice(0, -1), row] : [...current.attempts, row],
    };
  });

export const waitForMesh = (key: string, run: number, waiting: boolean) =>
  patchService(key, run, (current) => (current.waitingForMesh === waiting ? current : { ...current, waitingForMesh: waiting }));

/** The check ended (either way): the service's own status says how. */
export const endServiceCheck = (key: string, run: number) => {
  if (state.services[key]?.run !== run) return;
  const { [key]: _done, ...rest } = state.services;
  set({ ...state, services: rest });
};

/* ───────────────────────────────── mesh ───────────────────────────────── */

export const setMeshProgress = (mesh: MeshProgress | undefined) => {
  const current = state.mesh;
  if (
    current &&
    mesh &&
    current.meshId === mesh.meshId &&
    current.phase === mesh.phase &&
    current.label === mesh.label &&
    current.detail === mesh.detail &&
    current.demandedBy.join() === mesh.demandedBy.join()
  ) {
    return;
  }
  if (!mesh) {
    if (current) set({ ...state, mesh: undefined });
    return;
  }
  // A phase that did not change keeps its clock.
  const since = current && current.meshId === mesh.meshId && current.phase === mesh.phase ? current.since : Date.now();
  set({ ...state, mesh: { ...mesh, since } });
};

/** Tests only. */
export const resetConnectionProgress = () => set(EMPTY);
