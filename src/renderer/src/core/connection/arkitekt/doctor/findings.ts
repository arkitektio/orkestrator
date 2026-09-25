import type {
  MeshProbeResult,
  NetworkProbeResult,
  ProbeTarget,
  RemedyId,
} from "../../../../../../main/doctor/protocol";
import type { MeshStatusPayload } from "../../../../../../main/mesh/protocol";
import type { HubHealthFacts } from "./hubHealth";
import type { Alias } from "../fakts/faktsSchema";

/**
 * What the doctor actually hands the user: a ranked list of sentences, each
 * saying what is wrong and — where we can honestly offer one — what to do.
 *
 * A finding is data, never JSX, so the rules that produce it (`diagnose.ts`)
 * can be tested by id without rendering anything.
 */

export type FindingSeverity = "blocker" | "warning" | "info" | "ok";

/**
 * The four things a remedy can be, in ascending order of how much we presume:
 * tell them, give them the string, open a page, or actually do it. Only `run`
 * touches the machine, only `run` needs a confirmation, and its `id` comes
 * from the protocol's closed allowlist.
 */
export type Remedy =
  | { kind: "manual"; instructions: string }
  | { kind: "copy"; label: string; value: string }
  | { kind: "open-url"; label: string; url: string }
  | { kind: "navigate"; label: string; path: string }
  | { kind: "run"; label: string; id: RemedyId; confirm: string };

export type Finding = {
  /** Stable across runs and releases: the tests assert on these. */
  id: string;
  severity: FindingSeverity;
  /** One sentence, in the user's language, saying what is wrong. */
  title: string;
  /** Why we believe that. */
  detail: string;
  /** The raw lines — URL, errno, status — shown folded away, in mono. */
  evidence?: string[];
  remedy?: Remedy;
  docs?: string;
  /** Which alias this is about, when it is about one. */
  targetLabel?: string;
};

/**
 * `meshCoordUrl` is the deployment's mesh control server from its discovery
 * document: a string when it has one, `null` when the document is known and
 * names none, `undefined` when the caller cannot tell. The three are
 * different verdicts (not let in / not advertised / unknown).
 */
export type DoctorContext = (
  | { kind: "discovery"; endpointUrl: string; meshCoordUrl?: string | null }
  | {
      kind: "service";
      serviceKey: string;
      endpointUrl?: string;
      meshCoordUrl?: string | null;
      /**
       * lok's own alias on the coordination server (`fakts.self.alias`) — what
       * the app actually talks to there once signed in, and so what the doctor
       * probes for that hop, challenge path and all.
       */
      coordinationAlias?: Alias;
    }
) & {
  /**
   * The active profile's own mesh (meshes belong to a profile): its id, to
   * pick it out of the sidecar's list, and whether the user switched it off.
   */
  profileMesh?: { id: string; enabled: boolean };
};

export type DiagnoseInput = {
  context: DoctorContext;
  targets: ProbeTarget[];
  network: NetworkProbeResult[];
  mesh?: MeshProbeResult;
  /**
   * The built-in mesh sidecar's meshes, if the bridge offered them. A running
   * mesh that covers a target makes the system client and the direct probes
   * for that target irrelevant.
   */
  sidecar?: MeshStatusPayload;
  /** The message the app already showed the user, if any. */
  originalError?: string;
  /**
   * Did the renderer's own `fetch` fail while main got through? The one signal
   * that points inside the app rather than at the network.
   */
  rendererReachable?: boolean;
  /** False on a web build / when the preload bridge is missing. */
  probesAvailable?: boolean;
  /**
   * What the hub last told the coordination server about itself. Absent when
   * the caller has no lok client (signed out) or lok did not answer.
   */
  hub?: HubHealthFacts;
};

/**
 * How asking lok for the hub's report went. Kept apart from the report itself
 * because "lok answered, the hub never reported" and "lok did not answer" are
 * different facts about different hops.
 */
export type LokOutcome =
  | { status: "ok"; hub: HubHealthFacts }
  | { status: "no-hub" }
  | { status: "failed"; message: string }
  | { status: "timeout" }
  /** No lok client on this surface (signed out), so nobody asked. */
  | { status: "not-available" };

export type DoctorReport = {
  startedAt: number;
  durationMs: number;
  context: DoctorContext;
  targets: ProbeTarget[];
  findings: Finding[];
  network: NetworkProbeResult[];
  mesh?: MeshProbeResult;
  sidecar?: MeshStatusPayload;
  hub?: HubHealthFacts;
  lok?: LokOutcome;
};

const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  blocker: 0,
  warning: 1,
  info: 2,
  ok: 3,
};

/**
 * Within a severity, cause before symptom. A computer that cannot reach the
 * coordination server explains everything, a hub that is down explains its
 * mesh peer going offline, a mesh problem explains every timeout below it, so
 * they lead; the per-target network noise sorts last.
 */
const FAMILY_ORDER = ["upstream.", "hub.", "mesh.", "discovery.", "net.tls.", "net.http.", "net.tcp.", "net."];

const familyRank = (id: string): number => {
  const index = FAMILY_ORDER.findIndex((prefix) => id.startsWith(prefix));
  return index === -1 ? FAMILY_ORDER.length : index;
};

export const rankFindings = (findings: Finding[]): Finding[] => {
  const seen = new Set<string>();
  const deduped = findings.filter((finding) => {
    const key = `${finding.id}::${finding.targetLabel ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return familyRank(a.id) - familyRank(b.id);
  });
};

export const hasBlocker = (findings: Finding[]): boolean =>
  findings.some((finding) => finding.severity === "blocker");

/**
 * The one thing to tell the user.
 *
 * A ranked list makes the reader do the triage, and the whole point of the
 * doctor is that they should not have to: they asked "why can't I connect",
 * and they want an answer, not a differential. `rankFindings` already sorts
 * cause above symptom, so the head of the list IS the verdict — this names
 * that, so the panel cannot drift from the ordering.
 */
export const primaryFinding = (findings: Finding[]): Finding | undefined => findings[0];

/** Everything else: kept, but folded away under the verdict. */
export const secondaryFindings = (findings: Finding[]): Finding[] => findings.slice(1);
