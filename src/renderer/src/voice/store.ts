import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import type {
  VoiceEngineStatus,
  VoiceModelProgress,
} from "../../../main/voice/protocol";

/**
 * Everything the voice UI renders from, outside React (the same shape as
 * `app/localActionRuns.ts`): the engine's state as the main process reports
 * it, and the one dictation session this window may have open.
 *
 * A module store because the session outlives any component: it is started
 * by a window-level hotkey, drawn by a badge inside the palette or floating
 * over a form field, and stopped by whichever of those goes away first.
 */

export type VoiceSessionMode = "palette" | "fill";

/** "hold": the hotkey is held and its release ends the session. "toggle": hands-free. */
export type VoiceSessionTrigger = "hold" | "toggle";

export type VoiceSessionState = {
  mode: VoiceSessionMode;
  trigger: VoiceSessionTrigger;
  /** The element dictation goes into. */
  target: HTMLElement;
  /** Microphone open and frames flowing. False while the mic is being opened. */
  listening: boolean;
  /** Microphone closed; waiting for the engine's last transcript. */
  finishing: boolean;
  /** The VAD currently hears speech. */
  speaking: boolean;
  /** 0–1 input level, for the badge. */
  level: number;
  lastTranscript?: string;
  error?: string;
};

export type VoiceState = {
  status: VoiceEngineStatus;
  modelId?: string;
  error?: string;
  /** Set while `status === "downloading"`. */
  progress?: VoiceModelProgress;
  session: VoiceSessionState | null;
};

export const voiceStore = createStore<VoiceState>(() => ({
  status: "off",
  session: null,
}));

export const setVoiceStatus = (next: {
  status: VoiceEngineStatus;
  modelId?: string;
  error?: string;
}) =>
  voiceStore.setState((state) => ({
    status: next.status,
    modelId: next.modelId,
    error: next.error,
    progress: next.status === "downloading" ? state.progress : undefined,
  }));

export const setVoiceProgress = (progress: VoiceModelProgress) =>
  voiceStore.setState({ progress });

export const setVoiceSession = (session: VoiceSessionState | null) =>
  voiceStore.setState({ session });

export const updateVoiceSession = (patch: Partial<Omit<VoiceSessionState, "target" | "mode">>) =>
  voiceStore.setState((state) =>
    state.session ? { session: { ...state.session, ...patch } } : {},
  );

export const useVoiceState = <T,>(selector: (state: VoiceState) => T): T =>
  useStore(voiceStore, selector);

/** Test seam. */
export const resetVoiceStore = () =>
  voiceStore.setState({ status: "off", modelId: undefined, error: undefined, progress: undefined, session: null });

/** The desktop bridge is there; the web build has no engine to talk to. */
export const isVoiceAvailable = (): boolean =>
  typeof window !== "undefined" && typeof window.api?.voice?.start === "function";
