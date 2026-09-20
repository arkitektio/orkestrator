import { createRequire } from "node:module";
import {
  VOICE_SAMPLE_RATE,
  isSessionInbound,
  isWorkerInbound,
  type RecognizerConfig,
  type SessionOutbound,
  type WorkerOutbound,
} from "./protocol";

/**
 * The voice engine's own process.
 *
 * This is the entry of the `utilityProcess` that `VoiceService` forks — the
 * only place sherpa-onnx's native addon is ever loaded. It is kept out of the
 * main process on purpose: the addon and its ~30 MB of onnxruntime stay off the
 * main bundle (see `external` in electron.vite.config.ts), a crash in native
 * code takes down this process and not the app, and decoding — which is CPU
 * work measured in hundreds of milliseconds — never touches the main loop.
 *
 * Sessions: every window that starts dictating attaches a pair of ports. The
 * audio port carries raw 16 kHz float32 frames from that window's AudioWorklet;
 * the control port carries everything else. Each session runs its own VAD (the
 * VAD keeps per-stream state) over one shared recognizer.
 */

type MessageEventLike = { data: unknown; ports: Electron.MessagePortMain[] };

type SherpaModule = {
  OfflineRecognizer: {
    createAsync(config: RecognizerConfig): Promise<OfflineRecognizer>;
  };
  Vad: new (config: Record<string, unknown>, bufferSizeInSeconds: number) => Vad;
};

type OfflineStream = { acceptWaveform(obj: { samples: Float32Array; sampleRate: number }): void };

type OfflineRecognizer = {
  createStream(): OfflineStream;
  decodeAsync(stream: OfflineStream): Promise<{ text?: string; lang?: string }>;
};

type Vad = {
  acceptWaveform(samples: Float32Array): void;
  isEmpty(): boolean;
  isDetected(): boolean;
  pop(): void;
  clear(): void;
  front(enableExternalBuffer?: boolean): { samples: Float32Array; start: number };
  reset(): void;
  flush(): void;
};

const require = createRequire(import.meta.url);
const parent = process.parentPort;

const send = (message: WorkerOutbound) => parent.postMessage(message);
const log = (message: string) => send({ type: "log", message });

/** Float32 samples out of whatever the port delivered: a buffer, a view, or a Buffer slice. */
const toSamples = (data: unknown): Float32Array | undefined => {
  if (data instanceof ArrayBuffer) return new Float32Array(data);
  if (ArrayBuffer.isView(data)) {
    // A Buffer may sit at an unaligned offset of a pooled slab; copy it out.
    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    return new Float32Array(bytes.slice().buffer);
  }
  return undefined;
};

let sherpa: SherpaModule | undefined;
let recognizer: OfflineRecognizer | undefined;
let vadConfig: Record<string, unknown> | undefined;
const sessions = new Map<string, Session>();

const loadSherpa = (): SherpaModule => {
  if (!sherpa) {
    sherpa = require("sherpa-onnx-node") as SherpaModule;
  }
  return sherpa;
};

class Session {
  private vad: Vad | undefined;
  private speaking = false;
  /** Frames buffered while there is no VAD; decoded on `flush`. */
  private pending: Float32Array[] = [];
  private queue: Promise<void> = Promise.resolve();
  private closed = false;
  private frames = 0;

  constructor(
    readonly id: string,
    private readonly audio: Electron.MessagePortMain,
    private readonly control: Electron.MessagePortMain,
    private readonly recognizer: OfflineRecognizer,
  ) {
    if (vadConfig) {
      const lib = loadSherpa();
      this.vad = new lib.Vad(vadConfig, 60);
    }
    audio.on("message", (event: MessageEventLike) => this.onAudio(event.data));
    control.on("message", (event: MessageEventLike) => this.onControl(event.data));
    audio.on("close", () => this.close());
    control.on("close", () => this.close());
    audio.start();
    control.start();
  }

  private emit(message: SessionOutbound) {
    if (!this.closed) this.control.postMessage(message);
  }

  private onAudio(data: unknown) {
    if (this.closed) return;
    try {
      this.handleAudio(data);
    } catch (error) {
      this.emit({ type: "error", message: `Audio handling failed: ${String(error)}` });
    }
  }

  private handleAudio(data: unknown) {
    const samples = toSamples(data);
    if (!samples || samples.length === 0) {
      if (this.frames === 0) log(`session ${this.id}: unusable audio message (${typeof data})`);
      return;
    }
    if (++this.frames === 1) {
      log(`session ${this.id}: first audio frame, ${samples.length} samples, vad=${Boolean(this.vad)}`);
    }

    if (!this.vad) {
      this.pending.push(samples);
      return;
    }

    this.vad.acceptWaveform(samples);
    const detected = this.vad.isDetected();
    if (detected && !this.speaking) {
      this.speaking = true;
      log(`session ${this.id}: speech start`);
      this.emit({ type: "speech-start" });
    }
    this.drain();
    if (!detected && this.speaking && this.vad.isEmpty()) {
      this.speaking = false;
      this.emit({ type: "speech-end" });
    }
  }

  /** Decode every utterance the VAD has finished cutting. */
  private drain() {
    if (!this.vad) return;
    while (!this.vad.isEmpty()) {
      // `false`: copy the segment out. The default hands back an "external"
      // buffer, which Electron's Node forbids ("External buffers are not
      // allowed") — and that threw on every frame after speech began.
      const segment = this.vad.front(false);
      this.vad.pop();
      this.enqueue(segment.samples);
    }
  }

  private enqueue(samples: Float32Array) {
    this.queue = this.queue
      .then(() => this.decode(samples))
      .catch((error) => this.emit({ type: "error", message: String(error) }));
  }

  private async decode(samples: Float32Array) {
    if (this.closed || samples.length === 0) return;
    const started = Date.now();
    const stream = this.recognizer.createStream();
    stream.acceptWaveform({ samples, sampleRate: VOICE_SAMPLE_RATE });
    const result = await this.recognizer.decodeAsync(stream);
    const text = (result.text ?? "").trim();
    let peak = 0;
    for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
    log(
      `session ${this.id}: decoded ${Math.round(samples.length / 16)} ms (peak ${peak.toFixed(3)}) in ${
        Date.now() - started
      } ms → ${text ? JSON.stringify(text) : "(empty)"}`,
    );
    if (!text) return;
    this.emit({
      type: "final",
      text,
      lang: result.lang ?? "",
      durationMs: Math.round((samples.length / VOICE_SAMPLE_RATE) * 1000),
      decodeMs: Date.now() - started,
    });
  }

  private onControl(data: unknown) {
    if (!isSessionInbound(data)) return;
    switch (data.type) {
      case "flush": {
        if (this.vad) {
          this.vad.flush();
          this.drain();
          if (this.speaking) {
            this.speaking = false;
            this.emit({ type: "speech-end" });
          }
        } else if (this.pending.length > 0) {
          const total = this.pending.reduce((sum, chunk) => sum + chunk.length, 0);
          const merged = new Float32Array(total);
          let offset = 0;
          for (const chunk of this.pending) {
            merged.set(chunk, offset);
            offset += chunk.length;
          }
          this.pending = [];
          this.enqueue(merged);
        }
        return;
      }
      case "reset": {
        this.vad?.clear();
        this.vad?.reset();
        this.pending = [];
        this.speaking = false;
        return;
      }
      case "close":
        this.close();
        return;
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    sessions.delete(this.id);
    try {
      this.audio.close();
      this.control.close();
    } catch {
      // Already closed from the other side.
    }
    send({ type: "session-closed", sessionId: this.id });
  }
}

const closeAllSessions = () => {
  for (const session of [...sessions.values()]) session.close();
};

// Anything that escapes the handlers below is reported, not lost: a utility
// process prints nothing anyone will read.
process.on("uncaughtException", (error) =>
  send({ type: "error", message: `Voice engine crashed: ${String(error?.stack ?? error)}` }),
);
process.on("unhandledRejection", (error) =>
  send({ type: "error", message: `Voice engine failed: ${String((error as Error)?.stack ?? error)}` }),
);

parent.on("message", async (event: MessageEventLike) => {
  const message = event.data;
  if (!isWorkerInbound(message)) {
    log(`ignored message ${JSON.stringify(message).slice(0, 80)}`);
    return;
  }
  log(`message ${message.type} (ports: ${event.ports?.length ?? 0})`);

  switch (message.type) {
    case "start": {
      try {
        closeAllSessions();
        const lib = loadSherpa();
        vadConfig = message.vadModelPath
          ? {
              sileroVad: {
                model: message.vadModelPath,
                threshold: 0.5,
                minSpeechDuration: 0.25,
                minSilenceDuration: 0.5,
                // Whisper takes at most 30 s; cut long monologues well before.
                maxSpeechDuration: 20,
                windowSize: 512,
              },
              sampleRate: VOICE_SAMPLE_RATE,
              numThreads: 1,
              debug: false,
            }
          : undefined;
        recognizer = await lib.OfflineRecognizer.createAsync(message.recognizer);
        log(`model loaded (vad=${Boolean(vadConfig)})`);
        send({ type: "ready" });
      } catch (error) {
        send({ type: "error", message: `Could not load the speech model: ${String(error)}` });
      }
      return;
    }
    case "attach": {
      const [audio, control] = event.ports;
      if (!recognizer || !audio || !control) {
        audio?.close();
        control?.close();
        send({ type: "error", message: "Voice engine is not ready" });
        return;
      }
      sessions.get(message.sessionId)?.close();
      try {
        sessions.set(message.sessionId, new Session(message.sessionId, audio, control, recognizer));
        log(`session ${message.sessionId}: attached`);
      } catch (error) {
        send({
          type: "error",
          message: `Could not attach voice session: ${String((error as Error)?.stack ?? error)}`,
        });
      }
      return;
    }
    case "stop": {
      closeAllSessions();
      recognizer = undefined;
      process.exit(0);
    }
  }
});

