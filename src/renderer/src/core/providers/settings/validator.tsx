import * as zod from "zod";

export const settingsValidator = zod.object({
  autoResolve: zod.boolean(),
  allowAutoRequest: zod.boolean(),
  allowBatch: zod.boolean(),
  darkMode: zod.boolean(),
  colorScheme: zod.string(),
  pollInterval: zod.number(),
  defaultZoomLevel: zod.number().min(0.25).max(3.0),
  startAgent: zod.boolean(),
  showHoverCards: zod.boolean(),
  agentExpanded: zod.boolean().optional(),
  brandHue: zod.number().min(0).max(360).optional(),
  brandChroma: zod.number().min(0).max(1).optional(),
  /** Let the open scene's main layer drive the brand hue. */
  sceneThemeSync: zod.boolean(),
  /**
   * Take a scene's thumbnail automatically the first time it is opened.
   *
   * Only ever fills a GAP: a scene that already has a snapshot is left alone,
   * so this can never overwrite a picture someone composed deliberately. Off
   * means scene cards stay black until someone snapshots by hand.
   */
  autoSceneSnapshot: zod.boolean(),
  /**
   * Translucent sidebar: the OS blurs the desktop behind the rail (macOS
   * vibrancy, Windows acrylic). Ignored where the platform cannot draw it.
   */
  railGlass: zod.boolean(),
  /**
   * How see-through the glass rail is, 0 (the flat sidebar colour) to 1 (the
   * bare OS blur). What is left is the sidebar colour laid over the blur.
   */
  railGlassTransparency: zod.number().min(0).max(1),

  // ── Experiments (Settings → General) ──
  // Recent work that ships ON: each flag is the off switch for a feature that
  // is still settling, so a user who hits a bad frame can put the app back to
  // the behaviour it had before it landed. Deleting a flag means the feature
  // stopped being an experiment, not that it was turned off.
  /** Warm the smart menu's queries on hover / selection (`smart/extensions/prefetch`). */
  experimentMenuPrefetch: zod.boolean(),
  /** The action button that follows the hovered annotation in a scene. */
  experimentAnnotationHover: zod.boolean(),
  /** Running tasks as live rows in the rail, rather than only on their page. */
  experimentTaskIsland: zod.boolean(),

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
  pollInterval: 3000,
  defaultZoomLevel: 1,
  startAgent: false,
  showHoverCards: true,
  agentExpanded: false,
  brandHue: 267.256,
  brandChroma: 0.20962,
  sceneThemeSync: true,
  autoSceneSnapshot: true,
  railGlass: false,
  railGlassTransparency: 0.7,
  experimentMenuPrefetch: true,
  experimentAnnotationHover: true,
  experimentTaskIsland: true,
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
