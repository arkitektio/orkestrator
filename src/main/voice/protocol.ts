/**
 * The voice engine's wire protocol — every message that crosses one of its
 * three boundaries, in one place, with no runtime dependencies so the preload
 * and the renderer can import the types and the worker can import the guards.
 *
 *   renderer ──ipc invoke──► main (VoiceService)   : VoiceStartConfig, model ids
 *   main     ──ipc send────► every renderer         : VoiceEvent  ("voice:event")
 *   main     ──parentPort──► utility process        : WorkerInbound / WorkerOutbound
 *   renderer ──MessagePort─► utility process        : audio frames + SessionInbound
 *   utility  ──MessagePort─► renderer               : SessionOutbound
 *
 * The audio port carries nothing but `ArrayBuffer`s of 16 kHz mono float32
 * samples; it has no envelope so the worklet can post buffers straight through.
 */

export const VOICE_SAMPLE_RATE = 16000;

/** The channel the renderer receives ports on (`webContents.postMessage`). */
export const VOICE_PORTS_CHANNEL = "voice:ports";
/** The channel every engine-state change is broadcast on. */
export const VOICE_EVENT_CHANNEL = "voice:event";

export type VoiceModelKind = "whisper" | "moonshine" | "nemo_transducer";

export type VoiceEngineStatus =
  | "off"
  | "starting"
  | "downloading"
  | "ready"
  | "error";

export type VoiceStartConfig = {
  modelId: string;
  /** ISO-639-1 code or "auto". Only whisper honours it. */
  language: string;
  threads: number;
  /** Base URL to fetch model files from instead of the catalog's default. */
  modelHost?: string;
};

export type VoiceModelProgress = {
  modelId: string;
  file: string;
  fileIndex: number;
  fileCount: number;
  loaded: number;
  /** 0 when the server sent no content-length. */
  total: number;
};

/** A catalog entry as the renderer sees it (no paths, no config). */
export type VoiceCatalogEntry = {
  id: string;
  label: string;
  kind: VoiceModelKind;
  languages: "multi" | readonly string[];
  sizeMB: number;
  note: string;
};

export type VoiceModelState = {
  id: string;
  downloaded: boolean;
  /** Bytes on disk, complete or not. */
  bytes: number;
};

export type VoiceStatusPayload = {
  status: VoiceEngineStatus;
  modelId?: string;
  language?: string;
  error?: string;
};

export type VoiceEvent =
  | ({ type: "status" } & VoiceStatusPayload)
  /** Diagnostics from the engine process, shown in the renderer console. */
  | { type: "log"; message: string }
  | { type: "model-progress"; progress: VoiceModelProgress }
  | { type: "model-done"; modelId: string }
  | { type: "model-error"; modelId: string; error: string };

/** What the renderer gets back from `voice:request-ports`. */
export type VoicePortsPayload = { sessionId: string };

// ── main ⇄ utility process ──

export type RecognizerConfig = Record<string, unknown>;

export type WorkerInbound =
  | {
      type: "start";
      recognizer: RecognizerConfig;
      /** Absent → no VAD; the session decodes only on `flush`. */
      vadModelPath?: string;
      threads: number;
    }
  /** Carries the session's [audio, control] ports in the message's transfer list. */
  | { type: "attach"; sessionId: string }
  | { type: "stop" };

export type WorkerOutbound =
  | { type: "ready" }
  | { type: "log"; message: string }
  | { type: "error"; message: string }
  | { type: "session-closed"; sessionId: string };

// ── renderer ⇄ utility process (per session, on the control port) ──

export type SessionInbound =
  /** Decode whatever is buffered now (end of a push-to-talk hold). */
  | { type: "flush" }
  /** Drop buffered audio without decoding it. */
  | { type: "reset" }
  | { type: "close" };

export type SessionOutbound =
  | { type: "speech-start" }
  | { type: "speech-end" }
  | {
      type: "final";
      text: string;
      /** Whisper reports the detected language; other models leave it empty. */
      lang: string;
      durationMs: number;
      decodeMs: number;
    }
  | { type: "error"; message: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isWorkerInbound = (value: unknown): value is WorkerInbound =>
  isRecord(value) &&
  (value.type === "start" || value.type === "attach" || value.type === "stop");

export const isSessionInbound = (value: unknown): value is SessionInbound =>
  isRecord(value) &&
  (value.type === "flush" || value.type === "reset" || value.type === "close");

export const isSessionOutbound = (value: unknown): value is SessionOutbound =>
  isRecord(value) &&
  (value.type === "speech-start" ||
    value.type === "speech-end" ||
    value.type === "final" ||
    value.type === "error");

export const isVoiceEvent = (value: unknown): value is VoiceEvent =>
  isRecord(value) &&
  (value.type === "status" ||
    value.type === "log" ||
    value.type === "model-progress" ||
    value.type === "model-done" ||
    value.type === "model-error");
