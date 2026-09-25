import { useSettings } from "@/core/providers/settings/SettingsContext";
import { useEffect, useRef } from "react";
import { setVoiceStatus, isVoiceAvailable } from "./store";
import { VoiceRuntime } from "./VoiceRuntime";

/**
 * The opt-in gate. Off (the default), or in the web build, this renders
 * nothing and imports nothing further: no engine, no microphone, no model —
 * the same shape as the agent (`settings.startAgent` → `AgentProvider`).
 *
 * Switching it off is the one moment the renderer stops the engine
 * explicitly; everything else that ends it (last window closing, quit) is the
 * main process's call.
 */
export const VoiceInput = () => {
  const { settings } = useSettings();
  const enabled = settings.voiceControl && isVoiceAvailable();
  const wasEnabled = useRef(enabled);

  useEffect(() => {
    if (wasEnabled.current && !enabled) {
      setVoiceStatus({ status: "off" });
      void window.api.voice.stop();
    }
    wasEnabled.current = enabled;
  }, [enabled]);

  return enabled ? <VoiceRuntime /> : null;
};
