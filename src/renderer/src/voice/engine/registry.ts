import type { SpeechEngine, VoiceEngineId } from "./types";

/**
 * Engine plugins, loaded on demand. `import()` so an engine's code is not
 * part of the app until voice input is switched on and that engine chosen.
 */
const ENGINES: Record<VoiceEngineId, () => Promise<SpeechEngine>> = {
  native: () => import("./native").then((module) => module.createNativeEngine()),
};

export const loadSpeechEngine = (id: VoiceEngineId): Promise<SpeechEngine> => {
  const load = ENGINES[id];
  if (!load) {
    return Promise.reject(new Error(`Unknown speech engine "${id}"`));
  }
  return load();
};
