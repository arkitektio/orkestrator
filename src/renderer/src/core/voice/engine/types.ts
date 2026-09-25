import type {
  VoiceEvent,
  VoiceStartConfig,
  VoiceStatusPayload,
} from "../../../../../main/voice/protocol";

/**
 * A speech engine, as the renderer sees it: something that can be started
 * with a model and a language, reports its state, and hands out sessions.
 *
 * A session is a pair of `MessagePort`s. The audio port takes raw 16 kHz
 * float32 frames (the AudioWorklet posts straight into it); the control port
 * carries `SessionInbound` / `SessionOutbound` from `main/voice/protocol.ts`.
 *
 * The engine is a plugin so where the model runs is a setting, not a build:
 * `native` (sherpa-onnx in a utilityProcess) is the one that exists; a
 * `browser` (onnxruntime-web in a Worker) or `remote` (an Arkitekt service)
 * engine would implement the same four methods and nothing above them changes.
 */
export type VoiceSessionPorts = {
  sessionId: string;
  audio: MessagePort;
  control: MessagePort;
};

export interface SpeechEngine {
  start(config: VoiceStartConfig): Promise<VoiceStatusPayload>;
  stop(): Promise<void>;
  status(): Promise<VoiceStatusPayload>;
  onEvent(cb: (event: VoiceEvent) => void): () => void;
  openSession(): Promise<VoiceSessionPorts>;
}

export type VoiceEngineId = "native";
