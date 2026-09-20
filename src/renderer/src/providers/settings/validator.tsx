import * as zod from "zod";

export const settingsValidator = zod.object({
  autoResolve: zod.boolean(),
  allowAutoRequest: zod.boolean(),
  allowBatch: zod.boolean(),
  darkMode: zod.boolean(),
  colorScheme: zod.string(),
  experimental: zod.boolean(),
  pollInterval: zod.number(),
  experimentalViv: zod.boolean(),
  experimentalCache: zod.boolean(),
  defaultZoomLevel: zod.number().min(0.25).max(3.0),
  startAgent: zod.boolean(),
  showHoverCards: zod.boolean(),
  agentExpanded: zod.boolean().optional(),
  brandHue: zod.number().min(0).max(360).optional(),
  brandChroma: zod.number().min(0).max(1).optional(),
  /** Let the open scene's main layer drive the brand hue. */
  sceneThemeSync: zod.boolean(),

  // ── Voice input (see `src/renderer/src/voice`) ──
  /** Master switch. Off means nothing voice-related is loaded or run. */
  voiceControl: zod.boolean(),
  /** Which speech engine plugin runs the model. Only `native` exists today. */
  voiceEngine: zod.enum(["native"]),
  /** ISO-639-1 code, or "auto" to let the model detect it. */
  voiceLanguage: zod.string(),
  /** A catalog id from `src/main/voice/catalog.ts`. */
  voiceModel: zod.string(),
  /** `KeyboardEvent.code` pressed together with ⌘ / Ctrl. */
  voiceHotkey: zod.string(),
  /** `MediaDeviceInfo.deviceId`, or null for the system default. */
  voiceInputDeviceId: zod.string().nullable(),
  /** Seconds of silence after which listening stops on its own; 0 = never. */
  voiceAutoStop: zod.number().int().min(0).max(120),
  /** Decoder threads for the speech model. */
  voiceThreads: zod.number().int().min(1).max(8),
  /** Mirror to fetch models from instead of Hugging Face (offline labs). */
  voiceModelHost: zod.string().optional(),
});

export const defaultSettings: Settings = {
  autoResolve: true,
  allowAutoRequest: true,
  allowBatch: true,
  darkMode: true,
  colorScheme: "red",
  experimental: false,
  pollInterval: 3000,
  experimentalViv: false,
  experimentalCache: false,
  defaultZoomLevel: 0.8,
  startAgent: false,
  showHoverCards: true,
  agentExpanded: false,
  brandHue: 267.256,
  brandChroma: 0.20962,
  sceneThemeSync: true,
  voiceControl: false,
  voiceEngine: "native",
  voiceLanguage: "auto",
  voiceModel: "whisper-base",
  voiceHotkey: "KeyL",
  voiceInputDeviceId: null,
  voiceAutoStop: 8,
  voiceThreads: 2,
  voiceModelHost: undefined,
};

export type Settings = zod.infer<typeof settingsValidator>;
