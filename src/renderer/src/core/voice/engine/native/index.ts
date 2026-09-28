import type { VoicePortsPayload } from "../../../../../../main/voice/protocol";
import type { SpeechEngine, VoiceSessionPorts } from "../types";

/**
 * The sherpa-onnx engine: a thin client of `window.api.voice`, whose other
 * end is `VoiceService` in the main process and the utility process it forks.
 *
 * The only subtlety is how a session's ports arrive. They cannot cross the
 * contextBridge, so the preload relays them with `window.postMessage`
 * (Electron's pattern for context-isolated pages). That message and the
 * `requestPorts` reply race — the ports usually land first — so the listener
 * is attached before the request is made, and the session resolves once both
 * the id and the ports are known.
 */

const PORTS_TIMEOUT_MS = 5_000;

type PortsMessage = { type: "voice:ports" } & VoicePortsPayload;

const isPortsMessage = (data: unknown): data is PortsMessage =>
  typeof data === "object" &&
  data !== null &&
  (data as { type?: unknown }).type === "voice:ports" &&
  typeof (data as { sessionId?: unknown }).sessionId === "string";

const openNativeSession = (): Promise<VoiceSessionPorts> =>
  new Promise<VoiceSessionPorts>((resolve, reject) => {
    const received = new Map<string, MessagePort[]>();
    let wanted: string | undefined;
    let settled = false;

    const finish = (result: VoiceSessionPorts | Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      // Ports for sessions nobody is waiting for are closed, not leaked.
      for (const [id, ports] of received) {
        if (result instanceof Error || id !== result.sessionId) ports.forEach((port) => port.close());
      }
      result instanceof Error ? reject(result) : resolve(result);
    };

    const tryResolve = () => {
      if (!wanted) return;
      const ports = received.get(wanted);
      if (!ports) return;
      const [audio, control] = ports;
      if (!audio || !control) {
        finish(new Error("Voice session arrived without its ports"));
        return;
      }
      finish({ sessionId: wanted, audio, control });
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || !isPortsMessage(event.data)) return;
      received.set(event.data.sessionId, [...event.ports]);
      tryResolve();
    };

    const timer = setTimeout(
      () => finish(new Error("Timed out waiting for the voice session")),
      PORTS_TIMEOUT_MS,
    );

    window.addEventListener("message", onMessage);
    window.api.voice
      .requestPorts()
      .then((payload) => {
        wanted = payload.sessionId;
        tryResolve();
      })
      .catch((error) => finish(error instanceof Error ? error : new Error(String(error))));
  });

export const createNativeEngine = (): SpeechEngine => ({
  start: (config) => window.api.voice.start(config),
  stop: async () => {
    await window.api.voice.stop();
  },
  status: () => window.api.voice.status(),
  onEvent: (cb) => window.api.voice.onEvent(cb),
  openSession: openNativeSession,
});
