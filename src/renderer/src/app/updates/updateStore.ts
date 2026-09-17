import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

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
  | "error";

export type UpdateState = {
  phase: UpdatePhase;
  version?: string;
  /** Whatever the feed carried, for the settings card to show. */
  releaseNotes?: string;
  percent?: number;
  /** The updater's own free text, e.g. "Checking…". */
  status?: string;
  error?: string;
  /** The user hid the island. The settings page still shows the state. */
  dismissed: boolean;
};

const initialState: UpdateState = { phase: "idle", dismissed: false };

export const updateStore = createStore<UpdateState>(() => initialState);

const set = (patch: Partial<UpdateState>) =>
  updateStore.setState((state) => ({ ...state, ...patch }));

export const updateChecking = (status: string) =>
  set({ phase: "checking", status, error: undefined });

export const updateAvailable = (
  info: { version?: string; releaseNotes?: unknown } | undefined,
) =>
  set({
    phase: "available",
    version: info?.version,
    releaseNotes:
      typeof info?.releaseNotes === "string" ? info.releaseNotes : undefined,
    error: undefined,
    // A new update is news again even if the last one was dismissed.
    dismissed: false,
  });

export const updateProgress = (progress: { percent?: number } | undefined) => {
  // electron-updater can emit a trailing progress tick after the download has
  // finished. Letting that through would take a "ready to restart" row back to
  // "downloading 99%", which cannot be recovered from without another download.
  if (updateStore.getState().phase === "downloaded") return;
  set({ phase: "downloading", percent: progress?.percent, error: undefined });
};

export const updateDownloaded = (info: { version?: string } | undefined) =>
  set({
    phase: "downloaded",
    percent: 100,
    version: info?.version ?? updateStore.getState().version,
    error: undefined,
  });

export const updateNone = () =>
  set({ phase: "none", percent: undefined, error: undefined });

export const updateError = (error: unknown) =>
  set({ phase: "error", error: String(error) });

/** Hide the island. Keeps the state, so the settings page still reports it. */
export const dismissUpdate = () => set({ dismissed: true });

export const useUpdateState = <T,>(selector: (state: UpdateState) => T): T =>
  useStore(updateStore, selector);

/** Test seam. */
export const resetUpdateState = () => updateStore.setState(initialState);
