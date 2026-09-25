import { isSessionOutbound, type SessionInbound } from "../../../../main/voice/protocol";
import { startCapture, type Capture } from "./audio/capture";
import type { SpeechEngine, VoiceSessionPorts } from "./engine/types";
import { insertText } from "./insertText";
import {
  setVoiceSession,
  updateVoiceSession,
  voiceStore,
  type VoiceSessionMode,
  type VoiceSessionTrigger,
} from "./store";

/**
 * One dictation session: a microphone, a pair of ports to the engine, and
 * the element the words go into.
 *
 * Deliberately not React. It is started by a window hotkey and ended from
 * several places — the hotkey released or pressed again, Escape, the target
 * losing focus, the palette closing, or silence — and most of those arrive
 * from outside any component tree. The store carries what the badges render;
 * this owns the resources.
 *
 * Two ways to end: `finish` closes the microphone at once but asks the engine
 * to decode whatever it was still holding and waits (briefly) for that
 * transcript before letting go of the target — this is what a released
 * push-to-talk key needs, otherwise the last thing said is lost. `stop`
 * discards everything immediately (Escape, unmount, errors).
 */

/** The badge may take focus for a click without ending the session. */
export const VOICE_BADGE_ATTRIBUTE = "data-voice-badge";

/** The window's controller, for surfaces (the badge) outside the runtime's tree. */
export const voiceSessionRef: { current: VoiceSessionController | null } = { current: null };

export const finishVoiceSession = (reason = "stopped") => voiceSessionRef.current?.finish(reason);

/** How long a finished session waits for the engine's last transcript. */
const FLUSH_WAIT_MS = 3_000;

export type VoiceSessionDeps = {
  engine: () => SpeechEngine | undefined;
  deviceId: () => string | null;
  /** Milliseconds of silence before a hands-free session ends itself; 0 = never. */
  autoStopMs: () => number;
  onStopped?: (reason: string) => void;
  onError?: (message: string) => void;
};

export class VoiceSessionController {
  private ports: VoiceSessionPorts | undefined;
  private capture: Capture | undefined;
  private target: HTMLElement | undefined;
  private cleanup: (() => void)[] = [];
  private autoStopTimer: ReturnType<typeof setTimeout> | undefined;
  private finishTimer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  /** A start that is waiting for its target (the palette input mounting). */
  private reserved = false;

  constructor(private readonly deps: VoiceSessionDeps) {}

  /** Live, reserved, or still draining a flush. */
  isActive(): boolean {
    return this.reserved || voiceStore.getState().session !== null;
  }

  /** Microphone open (or opening) — as opposed to draining after a finish. */
  isListening(): boolean {
    const session = voiceStore.getState().session;
    return this.reserved || (session !== null && !session.finishing);
  }

  get mode(): VoiceSessionMode | undefined {
    return voiceStore.getState().session?.mode;
  }

  get trigger(): VoiceSessionTrigger | undefined {
    return voiceStore.getState().session?.trigger;
  }

  /** Claim the slot before an async start, so a second press cannot double up. */
  reserve() {
    this.reserved = true;
  }

  unreserve() {
    this.reserved = false;
  }

  async start(mode: VoiceSessionMode, target: HTMLElement, trigger: VoiceSessionTrigger): Promise<void> {
    this.reserved = false;
    if (voiceStore.getState().session) this.stop("restart");
    const generation = ++this.generation;
    const engine = this.deps.engine();
    if (!engine) {
      this.deps.onError?.("Voice input is still starting");
      return;
    }

    this.target = target;
    console.info("[voice] session starting", mode, trigger, target.tagName, target.getAttribute("data-slot") ?? "");
    setVoiceSession({ mode, trigger, target, listening: false, finishing: false, speaking: false, level: 0 });
    this.watchTarget(target);

    try {
      const ports = await engine.openSession();
      if (generation !== this.generation) {
        closePorts(ports);
        return;
      }
      this.ports = ports;
      ports.control.onmessage = (event) => this.onControl(event.data);
      ports.control.start();

      const capture = await startCapture({
        deviceId: this.deps.deviceId(),
        audioPort: ports.audio,
        onLevel: (level) => updateVoiceSession({ level }),
      });
      if (generation !== this.generation) {
        capture.stop();
        return;
      }
      this.capture = capture;
      console.info("[voice] listening", ports.sessionId);
      updateVoiceSession({ listening: true });
      // The key may already have gone up while the microphone was opening.
      if (voiceStore.getState().session?.finishing) {
        this.flushNow("released-while-opening");
      } else if (voiceStore.getState().session?.trigger === "toggle") {
        this.armAutoStop();
      }
    } catch (error) {
      if (generation !== this.generation) return;
      const message = error instanceof Error ? error.message : String(error);
      this.deps.onError?.(message);
      this.stop("error");
    }
  }

  /** A held key tapped again: keep listening until told otherwise. */
  makeHandsFree() {
    if (!voiceStore.getState().session) return;
    updateVoiceSession({ trigger: "toggle" });
    this.armAutoStop();
  }

  /**
   * Close the microphone, decode what is left, then let go. Safe to call
   * twice; the second call is ignored while the first drains.
   */
  finish(reason = "finished"): void {
    const session = voiceStore.getState().session;
    if (!session || session.finishing) return;
    console.info("[voice] finishing", reason);
    this.clearAutoStop();
    updateVoiceSession({ listening: false, finishing: true, speaking: false, level: 0 });
    if (!this.capture) {
      // Still opening the microphone: `start` will flush once it is there.
      return;
    }
    this.capture.stop();
    this.capture = undefined;
    this.flushNow(reason);
  }

  private flushNow(reason: string) {
    this.capture?.stop();
    this.capture = undefined;
    if (!this.ports) {
      this.stop(reason);
      return;
    }
    try {
      this.ports.control.postMessage({ type: "flush" } satisfies SessionInbound);
    } catch {
      this.stop(reason);
      return;
    }
    if (this.finishTimer) clearTimeout(this.finishTimer);
    this.finishTimer = setTimeout(() => this.stop(`${reason}-timeout`), FLUSH_WAIT_MS);
  }

  /** Discard everything now. */
  stop(reason = "stopped"): void {
    this.reserved = false;
    if (!voiceStore.getState().session && !this.ports && !this.capture) return;
    this.generation++;
    this.clearAutoStop();
    if (this.finishTimer) clearTimeout(this.finishTimer);
    this.finishTimer = undefined;
    this.cleanup.forEach((dispose) => dispose());
    this.cleanup = [];
    this.capture?.stop();
    this.capture = undefined;
    if (this.ports) {
      try {
        this.ports.control.postMessage({ type: "close" } satisfies SessionInbound);
      } catch {
        // Port already gone.
      }
      closePorts(this.ports);
      this.ports = undefined;
    }
    this.target = undefined;
    setVoiceSession(null);
    this.deps.onStopped?.(reason);
  }

  private onControl(data: unknown) {
    if (!isSessionOutbound(data)) {
      console.info("[voice] unexpected session message", data);
      return;
    }
    console.info("[voice]", data.type, data.type === "final" ? data.text : "");
    const finishing = voiceStore.getState().session?.finishing ?? false;
    switch (data.type) {
      case "speech-start":
        if (!finishing) {
          updateVoiceSession({ speaking: true });
          this.clearAutoStop();
        }
        return;
      case "speech-end":
        if (!finishing) {
          updateVoiceSession({ speaking: false });
          this.armAutoStop();
        }
        return;
      case "final": {
        updateVoiceSession({ speaking: false, lastTranscript: data.text });
        if (this.target) {
          const inserted = insertText(this.target, data.text);
          if (!inserted) console.warn("[voice] could not insert into", this.target);
        } else {
          console.warn("[voice] transcript arrived with no target");
        }
        if (finishing) this.stop("finished");
        else this.armAutoStop();
        return;
      }
      case "error":
        // One toast per session: a fault in the audio path repeats per frame.
        if (!voiceStore.getState().session?.error) this.deps.onError?.(data.message);
        updateVoiceSession({ error: data.message });
        return;
    }
  }

  /** Only hands-free sessions time out; a held key ends when it is released. */
  private armAutoStop() {
    this.clearAutoStop();
    if (voiceStore.getState().session?.trigger !== "toggle") return;
    const ms = this.deps.autoStopMs();
    if (ms > 0) {
      this.autoStopTimer = setTimeout(() => this.finish("silence"), ms);
    }
  }

  private clearAutoStop() {
    if (this.autoStopTimer) clearTimeout(this.autoStopTimer);
    this.autoStopTimer = undefined;
  }

  /**
   * Escape discards. Focus moving off the target (to anything but the badge)
   * finishes: what was said still lands in the field it was said into.
   */
  private watchTarget(target: HTMLElement) {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") this.stop("escape");
    };
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Element | null;
      if (next?.closest?.(`[${VOICE_BADGE_ATTRIBUTE}]`)) {
        // Give focus straight back so typing keeps working.
        requestAnimationFrame(() => target.focus());
        return;
      }
      this.finish("blur");
    };
    target.addEventListener("keydown", onKeyDown);
    target.addEventListener("focusout", onFocusOut);
    this.cleanup.push(() => {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("focusout", onFocusOut);
    });
  }
}

const closePorts = (ports: VoiceSessionPorts) => {
  try {
    ports.audio.close();
    ports.control.close();
  } catch {
    // Already closed.
  }
};
