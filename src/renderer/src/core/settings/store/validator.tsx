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
  /** How much drop shadow the right-click menu casts. */
  menuShadow: zod.enum(["none", "soft", "medium", "strong"]),
  agentExpanded: zod.boolean().optional(),
  brandHue: zod.number().min(0).max(360).optional(),
  brandChroma: zod.number().min(0).max(1).optional(),
  /**
   * Whose colour tints the app: the brand on your membership in the active
   * organization (the same on every machine), or `brandHue`/`brandChroma`
   * here, on this machine only.
   */
  brandSource: zod.enum(["membership", "local"]),
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
  /**
   * What is painted behind the rail: nothing, one of the built-in backdrops,
   * or the user's own image (`custom`). The image itself is NOT in here: it
   * lives in IndexedDB (`backdropStore`), since this object is one JSON string
   * rewritten on every change.
   */
  railBackdrop: zod.enum(["none", "aurora", "grid", "custom"]),
  /** Bumped on every upload, so every window re-reads the stored image. */
  railBackdropVersion: zod.number(),
  /** How strongly the backdrop shows, 0.1 to 1. */
  railBackdropOpacity: zod.number().min(0.1).max(1),
  /** `fill` covers the rail; `bottom` keeps the image whole at its foot. */
  railBackdropFit: zod.enum(["fill", "bottom"]),
  /**
   * The SYSTEM-WIDE shortcut that brings Orkestrator forward with the palette
   * open, as an Electron accelerator; null turns it off. Registered by main
   * (`GlobalShortcutService`); ⌘K stays the in-app shortcut.
   */
  globalPaletteShortcut: zod.string().nullable(),

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

  /**
   * May the app run `tailscale status` to see how an address on a Tailscale
   * network it does not run itself is routed (direct, or through a DERP
   * relay)? `ask` asks once per session where the answer would be shown.
   */
  systemTailscale: zod.enum(["ask", "always", "never"]),

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

  // ── Renderer (Settings → Renderer, see `core/settings/renderer`) ──
  /**
   * What this computer has, as main's `HardwareService` found it. Null until
   * the first probe lands (and always in the web build). A SNAPSHOT, kept so
   * the memory ceiling derived from it is known synchronously at boot; "Detect
   * again" replaces it.
   */
  rendererHardware: zod
    .object({
      probedAt: zod.string(),
      totalRamMB: zod.number(),
      gpus: zod.array(
        zod.object({
          vendor: zod.string(),
          model: zod.string(),
          vramMB: zod.number().nullable(),
          vramDynamic: zod.boolean(),
          driverVersion: zod.string().nullable().optional(),
        }),
      ),
      cpu: zod
        .object({
          brand: zod.string(),
          cores: zod.number(),
          physicalCores: zod.number(),
          speedGHz: zod.number().nullable(),
        })
        .nullable()
        .optional(),
      os: zod
        .object({
          platform: zod.string(),
          distro: zod.string(),
          release: zod.string(),
          kernel: zod.string(),
          arch: zod.string(),
        })
        .nullable()
        .optional(),
      displays: zod
        .array(
          zod.object({
            width: zod.number(),
            height: zod.number(),
            refreshRate: zod.number().nullable(),
            main: zod.boolean(),
          }),
        )
        .optional(),
      adapterVendor: zod.string().nullable().optional(),
      adapter: zod
        .object({
          vendor: zod.string(),
          architecture: zod.string(),
          device: zod.string(),
          description: zod.string(),
          maxTextureDimension3D: zod.number().nullable(),
          maxBufferSize: zod.number().nullable(),
        })
        .nullable()
        .optional(),
    })
    .nullable(),
  /** GPU memory 3D scenes may take, in MB; null picks it from the hardware. */
  rendererGpuBudgetMB: zod.number().positive().nullable(),
  /** Memory for decoded image data, in MB; null follows the GPU ceiling. */
  rendererDecodeCacheMB: zod.number().positive().nullable(),

  // ── Telemetry (Settings → Telemetry) ──
  // Nothing here sends anything by itself. Both are ON unless switched off.
  /**
   * Look at this computer's hardware on first start (and on "Detect again")
   * and keep the result in `rendererHardware`. Off: nothing is detected, any
   * snapshot is dropped, and the renderer limits fall back to an estimate.
   */
  telemetryDetectHardware: zod.boolean(),
  /** Add the hardware snapshot to the text of a bug report the user files. */
  telemetryAttachHardware: zod.boolean(),
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
  menuShadow: "medium",
  agentExpanded: false,
  brandHue: 267.256,
  brandChroma: 0.20962,
  brandSource: "membership",
  sceneThemeSync: true,
  autoSceneSnapshot: true,
  railGlass: false,
  railGlassTransparency: 0.7,
  railBackdrop: "none",
  railBackdropVersion: 0,
  railBackdropOpacity: 1,
  railBackdropFit: "fill",
  globalPaletteShortcut: "CommandOrControl+Shift+Space",
  experimentMenuPrefetch: true,
  experimentAnnotationHover: true,
  experimentTaskIsland: true,
  systemTailscale: "ask",
  voiceControl: false,
  voiceEngine: "native",
  voiceLanguage: "auto",
  voiceModel: "whisper-base",
  voiceHotkey: "KeyL",
  voiceInputDeviceId: null,
  voiceAutoStop: 8,
  voiceThreads: 2,
  voiceModelHost: undefined,
  rendererHardware: null,
  rendererGpuBudgetMB: null,
  rendererDecodeCacheMB: null,
  telemetryDetectHardware: true,
  telemetryAttachHardware: true,
};

export type Settings = zod.infer<typeof settingsValidator>;
