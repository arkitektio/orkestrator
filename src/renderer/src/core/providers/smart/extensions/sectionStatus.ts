import type { SectionStatus, SmartSectionId } from "./section";

/**
 * How the menu knows when it has settled.
 *
 * Each mounted section reports what it has; `SmartContext` reads the summary
 * to drive the progress bar and the "No action available" line. A tiny
 * external store rather than React state, so a section reporting does not
 * re-render its siblings — only the summary reader.
 */

export type SectionReport = {
  /** `skipped`: the section's guard is not ready, so it will never answer. */
  status: SectionStatus | "skipped";
  count: number;
  /** Bumps whenever the section's rows change identity. */
  revision: number;
};

export type SectionStatusSnapshot = ReadonlyMap<SmartSectionId, SectionReport>;

const sameReport = (a: SectionReport | undefined, b: SectionReport) =>
  !!a && a.status === b.status && a.count === b.count && a.revision === b.revision;

export const createSectionStatusStore = () => {
  const entries = new Map<SmartSectionId, SectionReport>();
  const listeners = new Set<() => void>();
  // Replaced on every write: `useSyncExternalStore` compares snapshots by identity.
  let snapshot: SectionStatusSnapshot = new Map(entries);

  const emit = () => {
    snapshot = new Map(entries);
    listeners.forEach((listener) => listener());
  };

  return {
    report(id: SmartSectionId, report: SectionReport) {
      if (sameReport(entries.get(id), report)) return;
      entries.set(id, report);
      emit();
    },
    remove(id: SmartSectionId) {
      if (!entries.delete(id)) return;
      emit();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
  };
};

export type SectionStatusStore = ReturnType<typeof createSectionStatusStore>;

export const isPendingStatus = (status: SectionReport["status"]) =>
  status === "loading" || status === "revalidating";

export type SectionSummary = {
  /** Some expected section has not answered for the current variables. */
  pending: boolean;
  settled: boolean;
  /** Rows on screen, stale ones included. */
  total: number;
  /** Sum of revisions: changes whenever any section's rows change. */
  revision: number;
  error: boolean;
};

/**
 * An expected section with no entry yet counts as pending — a remote section
 * that has not mounted (deferred tier) must keep the bar on.
 */
export const summarize = (
  snapshot: SectionStatusSnapshot,
  expectedIds: readonly SmartSectionId[],
): SectionSummary => {
  let pending = false;
  let total = 0;
  let revision = 0;
  let error = false;
  for (const id of expectedIds) {
    const entry = snapshot.get(id);
    if (!entry || isPendingStatus(entry.status)) pending = true;
    if (!entry) continue;
    total += entry.count;
    revision += entry.revision;
    if (entry.status === "error") error = true;
  }
  return { pending, settled: !pending, total, revision, error };
};

export const isEmptyResult = (summary: SectionSummary) =>
  summary.settled && summary.total === 0 && !summary.error;
