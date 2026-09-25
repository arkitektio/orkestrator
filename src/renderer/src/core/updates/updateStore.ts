import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { normalizeReleaseNotes, type ReleaseNote } from "./releaseNotes";
import { describeUpdateError, type UpdateProblem } from "./updateErrors";

/**
 * What the app updater is doing, for everyone who wants to show it.
 *
 * The main process broadcasts its updater events to every window, but the only
 * listener used to be `UpdateChecker` on the settings page — so a download
 * running in the background was invisible unless the user happened to be
 * sitting on that one page, and the finished download announced itself with a
 * native modal instead.
 *
 * The events land here instead (see `UpdateListener`, mounted once), and both
 * the rail island and the settings card read from it. Module level so it
 * outlives the settings page, and so one subscription serves every reader
 * rather than each mounting its own and disagreeing about the percentage.
 */

export type UpdatePhase =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "none"
  /**
   * A release exists but its builds are not uploaded yet — CI tags first and
   * uploads minutes later. Not an error: main re-checks on its own.
   */
  | "pending"
  | "error";

export type UpdateState = {
  phase: UpdatePhase;
  version?: string;
  /** Whatever the feed carried, for the settings card to show. */
  releaseNotes?: ReleaseNote[];
  percent?: number;
  /** The updater's own free text, e.g. "Checking…". */
  status?: string;
  /** The readable one-liner of `problem`, for surfaces that want only text. */
  error?: string;
  /** What went wrong, classified, with the updater's own text as detail. */
  problem?: UpdateProblem;
  /** The user hid the island. The settings page still shows the state. */
  dismissed: boolean;
};

const initialState: UpdateState = { phase: "idle", dismissed: false };

export const updateStore = createStore<UpdateState>(() => initialState);

const set = (patch: Partial<UpdateState>) =>
  updateStore.setState((state) => ({ ...state, ...patch }));

export const updateChecking = (status: string) =>
  set({ phase: "checking", status, error: undefined, problem: undefined });

export const updateAvailable = (
  info: { version?: string; releaseNotes?: unknown } | undefined,
) =>
  set({
    phase: "available",
    version: info?.version,
    releaseNotes: normalizeReleaseNotes(info?.releaseNotes, info?.version),
    error: undefined,
    problem: undefined,
    // A new update is news again even if the last one was dismissed.
    dismissed: false,
  });

export const updateProgress = (progress: { percent?: number } | undefined) => {
  // electron-updater can emit a trailing progress tick after the download has
  // finished. Letting that through would take a "ready to restart" row back to
  // "downloading 99%", which cannot be recovered from without another download.
  if (updateStore.getState().phase === "downloaded") return;
  set({
    phase: "downloading",
    percent: progress?.percent,
    error: undefined,
    problem: undefined,
  });
};

export const updateDownloaded = (info: { version?: string } | undefined) =>
  set({
    phase: "downloaded",
    percent: 100,
    version: info?.version ?? updateStore.getState().version,
    error: undefined,
    problem: undefined,
  });

export const updateNone = () =>
  set({ phase: "none", percent: undefined, error: undefined, problem: undefined });

/**
 * Takes an Error, the `{ message, code }` main forwards, or a bare string. A
 * half-published release lands as `pending` with its version, not as an error.
 */
export const updateError = (error: unknown) => {
  const problem = describeUpdateError(error);
  if (problem.kind === "pending") {
    set({
      phase: "pending",
      version: problem.version ?? updateStore.getState().version,
      percent: undefined,
      problem,
      error: undefined,
    });
    return;
  }
  set({ phase: "error", error: problem.message, problem });
};

/** Hide the island. Keeps the state, so the settings page still reports it. */
export const dismissUpdate = () => set({ dismissed: true });

export const useUpdateState = <T,>(selector: (state: UpdateState) => T): T =>
  useStore(updateStore, selector);

/** Test seam. */
export const resetUpdateState = () => updateStore.setState(initialState);
