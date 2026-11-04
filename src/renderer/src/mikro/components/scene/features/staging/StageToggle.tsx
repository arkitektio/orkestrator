import { createContext, useContext, type ReactNode } from "react";

import { StagingResultSink } from "./StagingResultSink";

const StagingOwnerContext = createContext<string | null>(null);

/** The float that owns what is staged below, or null outside one. */
export const useStagingOwner = () => useContext(StagingOwnerContext);

/**
 * A float's content: whatever it stages is owned by `owner`, the rows below
 * can stage what they list (`DerivedItem`), and its actions' results are
 * staged rather than saved (`StagingResultSink`).
 */
export const FloatStagingScope = ({ owner, children }: { owner: string; children?: ReactNode }) => (
  <StagingOwnerContext.Provider value={owner}>
    <StagingResultSink owner={owner}>{children}</StagingResultSink>
  </StagingOwnerContext.Provider>
);
