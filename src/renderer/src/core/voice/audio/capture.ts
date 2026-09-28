import captureWorkletUrl from "./capture.worklet.ts?worker&url";

/**
 * Open the microphone and pipe it, resampled by the worklet, into a session's
 * audio port from the page thread (see the note in `capture.worklet.ts`).
 *
 * `getUserMedia` here — not on enable — so switching voice input on never
 * prompts for the microphone; the first hotkey press does. The stream, the
 * context and the worklet all belong to one session and go away with it.
 *
 * The worklet is bundled by Vite (`?worker&url`, the same worker pipeline the
 * zarr codec worker uses) so it can share `resample.ts` and still be a plain
 * module URL for `addModule`.
 */
export type Capture = {
  stop(): void;
};

export const startCapture = async ({
  deviceId,
  audioPort,
  onLevel,
}: {
  deviceId: string | null;
  audioPort: MessagePort;
  onLevel: (level: number) => void;
}): Promise<Capture> => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });

  const context = new AudioContext();
  try {
    await context.audioWorklet.addModule(captureWorkletUrl);
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    await context.close();
    throw error;
  }

  const source = context.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(context, "voice-capture", {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [1],
  });
  let frames = 0;
  node.port.onmessage = (event: MessageEvent) => {
    const data = event.data as { type?: string; level?: number; buffer?: ArrayBuffer } | undefined;
    if (data?.type === "level" && typeof data.level === "number") {
      onLevel(data.level);
    } else if (data?.type === "frame" && data.buffer) {
      // Copied, not transferred: the other end of this port is another
      // process, and a plain structured clone is the one thing every
      // Electron port supports.
      try {
        audioPort.postMessage(data.buffer);
        if (++frames === 1) console.info("[voice] first audio frame sent", data.buffer.byteLength, "bytes");
      } catch (error) {
        console.error("[voice] could not send audio frame", error);
      }
    }
  };

  source.connect(node);
  // A worklet only runs while it is part of the graph that reaches the
  // destination; it writes silence there.
  node.connect(context.destination);
  if (context.state === "suspended") {
    await context.resume();
  }

  let stopped = false;
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      node.port.postMessage({ type: "close" });
      source.disconnect();
      node.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      void context.close();
    },
  };
};
