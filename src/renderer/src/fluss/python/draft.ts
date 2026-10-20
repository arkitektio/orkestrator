import { Effects } from "@/fluss/api/graphql";

/**
 * Unsaved edits of a Python flow, kept in this browser. The server refuses a
 * source that does not validate, so work in progress has nowhere else to
 * live. A convenience: it may come back empty, and every access may throw.
 */
export type PythonFlowDraft = {
  source: string;
  title: string;
  manifest: { alias: string; actionHash: string; effect: Effects }[];
  structures: string[];
  savedAt: number;
};

const key = (base: string) => `fluss:pythonflow-draft:${base}`;

/** The buffer for a new flow, or for edits on top of version `previous`. */
export const draftKey = (previous: string | null | undefined) => key(previous ?? "new");

export const readDraft = (draftId: string): PythonFlowDraft | null => {
  try {
    const raw = localStorage.getItem(draftId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PythonFlowDraft;
    return typeof parsed?.source === "string" ? parsed : null;
  } catch {
    return null;
  }
};

export const writeDraft = (draftId: string, draft: Omit<PythonFlowDraft, "savedAt">) => {
  try {
    localStorage.setItem(draftId, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Storage full or blocked: the edits stay in memory only.
  }
};

export const clearDraft = (draftId: string) => {
  try {
    localStorage.removeItem(draftId);
  } catch {
    // Nothing to clear.
  }
};
