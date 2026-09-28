import { createResampler, rms } from "./resample";

/**
 * The microphone tap. Runs on the audio thread; resamples whatever the
 * device gives (44.1 / 48 kHz) down to the 16 kHz mono the speech model
 * wants, and posts fixed-size frames to the node's port. `capture.ts`
 * relays them into the session's Electron `MessagePort` from the page
 * thread — 16 small messages a second, and it keeps the Electron port (a
 * cross-process object with its own transfer rules) out of the worklet.
 *
 * The same port carries the input level, a few times a second, for the badge.
 */

// AudioWorklet globals — not in lib.dom.
declare const sampleRate: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options?: unknown);
}
declare function registerProcessor(
  name: string,
  processor: new (options: { processorOptions?: Record<string, unknown> }) => AudioWorkletProcessor,
): void;

const TARGET_RATE = 16000;
/** 1024 samples at 16 kHz = 64 ms per message. */
const FRAME_SIZE = 1024;
const LEVEL_INTERVAL_MS = 80;

class VoiceCaptureProcessor extends AudioWorkletProcessor {
  private readonly resampler = createResampler(sampleRate, TARGET_RATE);
  private frame = new Float32Array(FRAME_SIZE);
  private filled = 0;
  private lastLevelAt = 0;
  private closed = false;

  constructor(options: { processorOptions?: Record<string, unknown> }) {
    super(options);
    this.port.onmessage = (event: MessageEvent) => {
      const data = event.data as { type?: string } | undefined;
      if (data?.type === "close") this.closed = true;
    };
  }

  process(inputs: Float32Array[][]): boolean {
    if (this.closed) return false;
    const channel = inputs[0]?.[0];
    if (!channel || channel.length === 0) return true;

    const now = Date.now();
    if (now - this.lastLevelAt >= LEVEL_INTERVAL_MS) {
      this.lastLevelAt = now;
      this.port.postMessage({ type: "level", level: rms(channel) });
    }

    const resampled = this.resampler.push(channel);
    let offset = 0;
    while (offset < resampled.length) {
      const take = Math.min(FRAME_SIZE - this.filled, resampled.length - offset);
      this.frame.set(resampled.subarray(offset, offset + take), this.filled);
      this.filled += take;
      offset += take;
      if (this.filled === FRAME_SIZE) {
        const buffer = this.frame.buffer;
        this.port.postMessage({ type: "frame", buffer }, [buffer]);
        this.frame = new Float32Array(FRAME_SIZE);
        this.filled = 0;
      }
    }
    return true;
  }
}

registerProcessor("voice-capture", VoiceCaptureProcessor);
