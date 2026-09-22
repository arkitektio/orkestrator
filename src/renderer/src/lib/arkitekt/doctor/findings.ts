import type {
  MeshProbeResult,
  NetworkProbeResult,
  ProbeTarget,
  RemedyId,
} from "../../../../../main/doctor/protocol";

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

export type DoctorContext =
  | { kind: "discovery"; endpointUrl: string }
  | { kind: "service"; serviceKey: string; endpointUrl?: string };

export type DiagnoseInput = {
  context: DoctorContext;
  targets: ProbeTarget[];
  network: NetworkProbeResult[];
  mesh?: MeshProbeResult;
  /** The message the app already showed the user, if any. */
  originalError?: string;
  /**
   * Did the renderer's own `fetch` fail while main got through? The one signal
   * that points inside the app rather than at the network.
   */
  rendererReachable?: boolean;
  /** False on a web build / when the preload bridge is missing. */
  probesAvailable?: boolean;
};

export type DoctorReport = {
  startedAt: number;
  durationMs: number;
  context: DoctorContext;
  targets: ProbeTarget[];
  findings: Finding[];
  network: NetworkProbeResult[];
  mesh?: MeshProbeResult;
};

const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  blocker: 0,
  warning: 1,
  info: 2,
  ok: 3,
};

/**
 * Within a severity, cause before symptom. A mesh problem explains every
 * timeout below it, so it is listed first; the per-target network noise sorts
 * last.
 */
const FAMILY_ORDER = ["mesh.", "discovery.", "net.tls.", "net.http.", "net.tcp.", "net."];

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
