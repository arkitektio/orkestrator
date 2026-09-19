import { createStore } from "zustand/vanilla";
import { createScopedStoreHooks } from "@/lib/generic/createScopedStore";
import { DEFAULT_WEIGHTS, type DominanceWeights } from "../../../lib/importance";
import type { ColorBy } from "../model/colouring";

/**
 * The morphology viewer's view state — one store per mounted viewer (the
 * scene's and the timeline's scoped-store pattern), so two viewers on one page
 * never share a hover or a panel.
 *
 * Everything here is VIEW state: layer settings, HUD toggles, selection. The
 * model itself is not in the store — it is props/context, rebuilt when the
 * model changes.
 */

/** A panel anchored to a clicked point on the morphology (world µm). */
export type SectionPanel = {
  sectionId: string;
  position: [number, number, number];
};

export type MorphologyLayerSettings = {
  visible: boolean;
  colorBy: ColorBy;
  /** CSS colour for `colorBy: "uniform"`. */
  uniformColor: string;
  /** Multiplies every radius — thin dendrites read at arbor scale. */
  radiusScale: number;
  /** Floor (µm) under every drawn radius, applied after the scale. */
  minRadius: number;
};

export type NetworkLayerSettings = {
  visible: boolean;
  synapses: boolean;
  stimulators: boolean;
  connections: boolean;
};

export type HudSettings = {
  scaleBar: boolean;
  grid: boolean;
  axis: boolean;
  /** OrbitControls damping — the scene's "smooth camera". */
  smoothCamera: boolean;
  zoomToCursor: boolean;
};

export type MorphologyDisplayMode = "3D" | "Tree";

export type MorphologyState = {
  morphology: MorphologyLayerSettings;
  network: NetworkLayerSettings;
  importanceWeights: DominanceWeights;
  hud: HudSettings;
  displayMode: MorphologyDisplayMode;

  hoveredId: string | null;
  /** Open panels keyed by section id (at most one per section). */
  panels: Record<string, SectionPanel>;

  /** Bumped to ask the camera to re-frame the model (F, the fit button). */
  fitRequest: number;
  /** Written by the canvas as the camera moves; read by the scale bar. */
  worldUnitsPerPixel: number;
  /** Registered by the canvas; the settings' screenshot button calls it. */
  capture: (() => Promise<Blob | null>) | null;

  setMorphology: (patch: Partial<MorphologyLayerSettings>) => void;
  setNetwork: (patch: Partial<NetworkLayerSettings>) => void;
  setImportanceWeights: (weights: DominanceWeights) => void;
  setHud: (patch: Partial<HudSettings>) => void;
  setDisplayMode: (mode: MorphologyDisplayMode) => void;
  setHovered: (id: string | null) => void;
  /** Toggle a panel while keeping any others open (Ctrl/Cmd-click). */
  togglePanel: (panel: SectionPanel) => void;
  /** Show only this panel — or close it when it was the only one open. */
  toggleExclusive: (panel: SectionPanel) => void;
  closePanel: (sectionId: string) => void;
  closeAll: () => void;
  requestFit: () => void;
  setWorldUnitsPerPixel: (value: number) => void;
  registerCapture: (capture: (() => Promise<Blob | null>) | null) => void;
};

export type MorphologyStore = ReturnType<typeof createMorphologyStore>;

const DISPLAY_MODE_KEY = "elektro.neuronmodel.displayMode";

/**
 * The remembered display mode. A neuron model nominates no preferred view, so
 * the last choice stands in for it. Wrapped because storage can be absent or
 * throw (private windows, cleared site data).
 */
export const readDisplayMode = (): MorphologyDisplayMode => {
  try {
    return window.localStorage.getItem(DISPLAY_MODE_KEY) === "Tree" ? "Tree" : "3D";
  } catch {
    return "3D";
  }
};

const writeDisplayMode = (mode: MorphologyDisplayMode) => {
  try {
    window.localStorage.setItem(DISPLAY_MODE_KEY, mode);
  } catch {
    // A preference, not state: losing it costs one click.
  }
};

export const DEFAULT_MORPHOLOGY_SETTINGS: MorphologyLayerSettings = {
  visible: true,
  colorBy: "compartment",
  uniformColor: "#e5e7eb",
  radiusScale: 1,
  minRadius: 0,
};

export const createMorphologyStore = (
  initial: { displayMode?: MorphologyDisplayMode } = {},
) =>
  createStore<MorphologyState>((set, get) => ({
    morphology: DEFAULT_MORPHOLOGY_SETTINGS,
    network: { visible: true, synapses: true, stimulators: true, connections: true },
    importanceWeights: DEFAULT_WEIGHTS,
    hud: { scaleBar: true, grid: false, axis: false, smoothCamera: false, zoomToCursor: false },
    displayMode: initial.displayMode ?? "3D",

    hoveredId: null,
    panels: {},

    fitRequest: 0,
    worldUnitsPerPixel: 0,
    capture: null,

    setMorphology: (patch) => set({ morphology: { ...get().morphology, ...patch } }),
    setNetwork: (patch) => set({ network: { ...get().network, ...patch } }),
    setImportanceWeights: (importanceWeights) => set({ importanceWeights }),
    setHud: (patch) => set({ hud: { ...get().hud, ...patch } }),
    setDisplayMode: (displayMode) => {
      writeDisplayMode(displayMode);
      set({ displayMode });
    },
    setHovered: (hoveredId) => {
      if (get().hoveredId !== hoveredId) set({ hoveredId });
    },
    togglePanel: (panel) => {
      const { [panel.sectionId]: existing, ...rest } = get().panels;
      set({ panels: existing ? rest : { ...rest, [panel.sectionId]: panel } });
    },
    toggleExclusive: (panel) => {
      const panels = get().panels;
      const ids = Object.keys(panels);
      if (ids.length === 1 && panels[panel.sectionId]) set({ panels: {} });
      else set({ panels: { [panel.sectionId]: panel } });
    },
    closePanel: (sectionId) => {
      const { [sectionId]: _closed, ...rest } = get().panels;
      set({ panels: rest });
    },
    closeAll: () => {
      if (Object.keys(get().panels).length > 0) set({ panels: {} });
    },
    requestFit: () => set({ fitRequest: get().fitRequest + 1 }),
    setWorldUnitsPerPixel: (worldUnitsPerPixel) => {
      if (get().worldUnitsPerPixel !== worldUnitsPerPixel) set({ worldUnitsPerPixel });
    },
    registerCapture: (capture) => set({ capture }),
  }));

export const {
  StoreContext: MorphologyStoreContext,
  useScopedStore: useMorphologyStore,
  useStoreApi: useMorphologyStoreApi,
} = createScopedStoreHooks<MorphologyState, MorphologyStore>("MorphologyStore");
