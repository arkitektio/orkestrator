import { useCommandPalette } from "@/core/command/CommandPaletteProvider";
import { useSettings } from "@/core/settings/store/SettingsContext";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { VoiceEvent } from "../../../../main/voice/protocol";
import { loadSpeechEngine } from "./engine/registry";
import type { SpeechEngine } from "./engine/types";
import { attachVoiceHotkey } from "./hotkey";
import { VoiceSessionController, voiceSessionRef } from "./session";
import { setVoiceProgress, setVoiceStatus, voiceStore } from "./store";
import { VoiceFillBadge } from "./ui/VoiceMicBadge";

/**
 * The live half of voice input. Mounted by `VoiceInput` only while the
 * setting is on, inside `CommandPaletteProvider` (it opens the palette).
 *
 * Owns two things:
 *  - the engine: loaded and started from the settings, restarted when the
 *    model or language changes, and *not* stopped when this unmounts — a
 *    popout closing must not silence the main window; the main process stops
 *    the engine when the last window goes or when `VoiceInput` sees the
 *    setting switched off.
 *  - the hotkey → session wiring:
 *
 *      hold the key   → listen while held; releasing transcribes ("hold")
 *      tap it twice   → hands-free until the key, the badge, Escape or a
 *                       pause ends it ("toggle")
 *      press it again → ends a hands-free session (and transcribes)
 *
 *    A single quick tap is treated as a very short hold: it transcribes
 *    whatever was said in that moment, usually nothing.
 */

// The palette's OWN input. `command-input` is shared with every combobox and
// the New Tab page's search, and a query for it found those first.
const PALETTE_INPUT_SELECTOR = '[data-slot="palette-input"]';
const PALETTE_INPUT_WAIT_MS = 1_500;
/** Two presses this close together mean hands-free. */
const DOUBLE_TAP_MS = 450;

/** The palette's input, once the dialog has mounted it. */
const waitForPaletteInput = (): Promise<HTMLElement | null> =>
  new Promise((resolve) => {
    const deadline = performance.now() + PALETTE_INPUT_WAIT_MS;
    const look = () => {
      const input = document.querySelector<HTMLElement>(PALETTE_INPUT_SELECTOR);
      if (input) resolve(input);
      else if (performance.now() > deadline) resolve(null);
      else requestAnimationFrame(look);
    };
    look();
  });

const applyVoiceEvent = (event: VoiceEvent) => {
  switch (event.type) {
    case "status":
      console.info("[voice] engine", event.status, event.modelId ?? "", event.error ?? "");
      setVoiceStatus({ status: event.status, modelId: event.modelId, error: event.error });
      return;
    case "model-progress":
      setVoiceProgress(event.progress);
      return;
    case "log":
      console.info("[voice engine]", event.message);
      return;
    default:
      return;
  }
};

export const VoiceRuntime = () => {
  const { settings } = useSettings();
  const { open, openPalette } = useCommandPalette();

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const openRef = useRef(open);
  openRef.current = open;
  const openPaletteRef = useRef(openPalette);
  openPaletteRef.current = openPalette;
  const engineRef = useRef<SpeechEngine | undefined>(undefined);

  const controllerRef = useRef<VoiceSessionController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new VoiceSessionController({
      engine: () => (voiceStore.getState().status === "ready" ? engineRef.current : undefined),
      deviceId: () => settingsRef.current.voiceInputDeviceId,
      autoStopMs: () => settingsRef.current.voiceAutoStop * 1000,
      onError: (message) => toast.error(message),
    });
  }

  // ── engine ──
  const { voiceEngine, voiceModel, voiceLanguage, voiceThreads, voiceModelHost } = settings;
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    setVoiceStatus({ status: "starting", modelId: voiceModel });

    loadSpeechEngine(voiceEngine)
      .then(async (engine) => {
        if (cancelled) return;
        engineRef.current = engine;
        dispose = engine.onEvent(applyVoiceEvent);
        const status = await engine.start({
          modelId: voiceModel,
          language: voiceLanguage,
          threads: voiceThreads,
          modelHost: voiceModelHost || undefined,
        });
        if (!cancelled) setVoiceStatus(status);
      })
      .catch((error) => {
        if (!cancelled) {
          setVoiceStatus({ status: "error", error: error instanceof Error ? error.message : String(error) });
        }
      });

    return () => {
      cancelled = true;
      dispose?.();
      controllerRef.current?.stop("engine-changed");
    };
  }, [voiceEngine, voiceModel, voiceLanguage, voiceThreads, voiceModelHost]);

  // ── hotkey ──
  useEffect(() => {
    const controller = controllerRef.current!;
    voiceSessionRef.current = controller;
    let lastPressAt = 0;

    const dispose = attachVoiceHotkey({
      code: () => settingsRef.current.voiceHotkey,
      onPress: (mode, active) => {
        const now = performance.now();
        const sincePrevious = now - lastPressAt;
        lastPressAt = now;

        if (controller.isActive()) {
          if (controller.isListening() && controller.trigger === "hold" && sincePrevious < DOUBLE_TAP_MS) {
            // Second tap: the session that the first tap opened stays on.
            controller.makeHandsFree();
            return;
          }
          // A press during hands-free (or while a flush drains) ends it.
          controller.finish("hotkey");
          return;
        }

        const { status, error } = voiceStore.getState();
        if (status !== "ready") {
          toast.message(
            status === "error"
              ? `Voice input is unavailable: ${error ?? "engine error"}`
              : "Voice input is still loading…",
          );
          return;
        }

        if (mode === "fill" && active instanceof HTMLElement) {
          void controller.start("fill", active, "hold");
          return;
        }
        // "palette": open it (keeping a query the user already typed), then
        // dictate into its input once the dialog has mounted it. Reserved
        // meanwhile so a fast second tap does not open a second session.
        controller.reserve();
        if (!openRef.current) openPaletteRef.current({ fresh: true });
        void waitForPaletteInput().then((input) => {
          if (!input) {
            controller.unreserve();
            toast.error("Could not open the search bar for dictation");
            return;
          }
          input.focus();
          void controller.start("palette", input, "hold");
        });
      },
      onRelease: () => {
        // Only a held session ends on release; hands-free ignores the key up.
        if (controller.isListening() && controller.trigger !== "toggle") {
          controller.finish("release");
        }
      },
    });

    return () => {
      dispose();
      controller.stop("unmount");
      if (voiceSessionRef.current === controller) voiceSessionRef.current = null;
    };
  }, []);

  // The palette closing takes its dictation with it.
  useEffect(() => {
    if (!open && controllerRef.current?.mode === "palette") {
      controllerRef.current.stop("palette-closed");
    }
  }, [open]);

  return <VoiceFillBadge />;
};
