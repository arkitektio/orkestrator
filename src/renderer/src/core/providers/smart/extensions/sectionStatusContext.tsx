import React from "react";
import type { SmartSectionId } from "./section";
import {
  SectionReport,
  SectionStatusStore,
  SectionSummary,
  summarize,
} from "./sectionStatus";

const SectionStatusContext = React.createContext<SectionStatusStore | null>(null);

export const SectionStatusProvider = ({
  store,
  children,
}: {
  store: SectionStatusStore;
  children: React.ReactNode;
}) => (
  <SectionStatusContext.Provider value={store}>{children}</SectionStatusContext.Provider>
);

/**
 * Reports from a layout effect, so the report lands in the same commit as the
 * rows: by the time the browser paints, the menu has already re-rendered with
 * the right bar / empty line and re-pinned its first item against a DOM that
 * holds the new rows.
 *
 * Without a provider (the command palette mounts the leaf sections on its
 * own) this is a no-op, so a section keeps working standalone.
 */
export const useReportSectionStatus = (id: SmartSectionId, report: SectionReport) => {
  const store = React.useContext(SectionStatusContext);
  const { status, count, revision } = report;
  React.useLayoutEffect(() => {
    store?.report(id, { status, count, revision });
  }, [store, id, status, count, revision]);
  React.useLayoutEffect(() => () => store?.remove(id), [store, id]);
};

export const useSectionSummary = (
  store: SectionStatusStore,
  expectedIds: readonly SmartSectionId[],
): SectionSummary => {
  const snapshot = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return React.useMemo(() => summarize(snapshot, expectedIds), [snapshot, expectedIds]);
};
