import { createContext, useContext, useMemo, useRef, useState } from "react";
import type { DetailNeuronModelFragment } from "../../api/graphql";
import { NeuronModelTree } from "../tree/NeuronModelTree";
import { MorphologyModeControls } from "./chrome/MorphologyModeControls";
import { MorphologyScaleBar } from "./chrome/MorphologyScaleBar";
import { MorphologyShortcuts } from "./chrome/MorphologyShortcuts";
import { PanelOverlay, PanelProjector } from "./chrome/SectionPanels";
import { MorphologyCanvas } from "./gpu/MorphologyCanvas";
import { NetworkMarks } from "./gpu/NetworkMarks";
import { SectionTubes } from "./gpu/SectionTubes";
import { MorphologyLayerCards } from "./layers/MorphologyLayerCards";
import { sectionColors } from "./model/colouring";
import { dimOutsideFocus, hiddenOutsideFocus } from "./model/focus";
import { MorphologyDataProvider, useMorphologyData } from "./MorphologyData";
import {
  createMorphologyStore,
  MorphologyStoreContext,
  readDisplayMode,
  useMorphologyStore,
  useMorphologyStoreApi,
} from "./stores/morphologyStore";
import { useWebGPUGate, type WebGPUGate } from "./useWebGPUGate";

/**
 * The neuron model's morphology viewer — the public surface, shaped like the
 * scene's `Scene` and the timeline's `ExperimentScene`:
 *
 *  - `Provider` scopes one viewer: its store, the WebGPU gate and the model
 *    data. Wrap the whole page so the Layers tab and the viewport share it.
 *  - `Viewport` is the content area: the 3D canvas or the tree, the HUD.
 *  - `LayersSidebar` is the Layers tab.
 *  - `Embedded` is Provider + Viewport without the tree switch, for previews.
 *  - `Mini` is a small frame INSIDE another view (a timeline channel card):
 *    the focus framed with the rest dimmed, and nothing that reaches outside
 *    its box — no window keys, no section panels, no settings, no `?` sheet.
 *
 * Key the Provider on the model id: the store and the geometry belong to one
 * model, so navigating remounts rather than feeding a new model into a viewer
 * primed for the old one.
 */

const PhaseContext = createContext<WebGPUGate>({ phase: "checking", message: null });

const Provider = ({
  model,
  focus,
  embedded = false,
  children,
}: {
  model: DetailNeuronModelFragment;
  /**
   * Section ids to zoom in on (a cell's, or one section) — framed and orbited,
   * the rest of the model kept as context. Omit for the whole model.
   */
  focus?: readonly string[] | null;
  /** Previews always open in 3D and never remember a display mode. */
  embedded?: boolean;
  children: React.ReactNode;
}) => {
  const [store] = useState(() =>
    createMorphologyStore({ displayMode: embedded ? "3D" : readDisplayMode() }),
  );
  const gate = useWebGPUGate();

  return (
    <MorphologyStoreContext.Provider value={store}>
      <PhaseContext.Provider value={gate}>
        <MorphologyDataProvider model={model} focus={focus}>
          {children}
        </MorphologyDataProvider>
      </PhaseContext.Provider>
    </MorphologyStoreContext.Provider>
  );
};

const CloseAllPanels = () => {
  const hasPanels = useMorphologyStore((s) => Object.keys(s.panels).length > 0);
  const closeAll = useMorphologyStore((s) => s.closeAll);
  if (!hasPanels) return null;
  return (
    <button
      onClick={closeAll}
      title="Close all section panels (Esc)"
      className="pointer-events-auto absolute right-2 top-2 z-30 rounded-lg border border-black/10 bg-black/40 px-2.5 py-1 text-xs text-white/70 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white"
    >
      Close all
    </button>
  );
};

/** The 3D view: canvas, section panels and readouts. */
const MorphologyView = ({ mini = false }: { mini?: boolean }) => {
  const {
    model,
    morphology,
    network,
    compartments,
    importance,
    cellOf,
    sectionMap,
    compartmentMap,
    focus,
    frame,
  } = useMorphologyData();
  const colorBy = useMorphologyStore((s) => s.morphology.colorBy);
  const context = useMorphologyStore((s) => s.morphology.context);
  const uniform = useMorphologyStore((s) => s.morphology.uniformColor);
  const store = useMorphologyStoreApi();
  const nodes = useRef<Map<string, HTMLDivElement>>(new Map());

  const baseColors = useMemo(() => {
    const colors = sectionColors(morphology, {
      colorBy,
      compartments,
      importance: importance.hasData ? importance.colors : null,
      uniform,
    });
    return focus && context === "dim" ? dimOutsideFocus(colors, morphology, focus) : colors;
  }, [morphology, colorBy, compartments, importance, uniform, focus, context]);
  const hidden = useMemo(
    () => (focus && context === "hide" ? hiddenOutsideFocus(morphology, focus) : undefined),
    [morphology, focus, context],
  );

  return (
    <>
      <MorphologyCanvas morphology={morphology} frame={frame} keyboard={!mini}>
        <SectionTubes
          morphology={morphology}
          baseColors={baseColors}
          hidden={hidden}
          onSectionClick={mini ? undefined : (hit, e) => {
            // Anchor the panel at the exact point on the branch that was clicked.
            const panel = {
              sectionId: hit.section.id,
              position: hit.point.toArray() as [number, number, number],
            };
            // Ctrl/Cmd-click stacks panels; a plain click shows only this one.
            if (e.ctrlKey || e.metaKey) store.getState().togglePanel(panel);
            else store.getState().toggleExclusive(panel);
          }}
        />
        <NetworkMarks network={network} />
        {!mini && <PanelProjector nodes={nodes} />}
      </MorphologyCanvas>

      {!mini && (
        <PanelOverlay
          modelId={model.id}
          cellOf={cellOf}
          sectionMap={sectionMap}
          compartmentMap={compartmentMap}
          nodes={nodes}
        />
      )}
      <MorphologyScaleBar />
      {!mini && <CloseAllPanels />}
    </>
  );
};

const Viewport = ({ showDisplaySwitch = true }: { showDisplaySwitch?: boolean }) => {
  const { phase, message } = useContext(PhaseContext);
  const displayMode = useMorphologyStore((s) => s.displayMode);
  const { model } = useMorphologyData();
  const mode = showDisplaySwitch ? displayMode : "3D";

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-black">
      {mode === "Tree" ? (
        <NeuronModelTree model={model} embedded />
      ) : phase === "ready" ? (
        <MorphologyView />
      ) : phase === "unsupported" ? (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-xs text-white/60">
          {message}
        </div>
      ) : null}

      {(phase === "ready" || mode === "Tree") && (
        <MorphologyModeControls showDisplaySwitch={showDisplaySwitch} />
      )}
      <MorphologyShortcuts />
    </div>
  );
};

/** The 3D view alone, for `Mini`: no mode strip, no shortcuts sheet. */
const MiniViewport = () => {
  const { phase, message } = useContext(PhaseContext);
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {phase === "ready" ? (
        <MorphologyView mini />
      ) : phase === "unsupported" ? (
        <div className="absolute inset-0 grid place-items-center p-4 text-center text-xs text-white/60">
          {message}
        </div>
      ) : null}
    </div>
  );
};

const LayersSidebar = () => <MorphologyLayerCards />;

const Embedded = ({ model }: { model: DetailNeuronModelFragment }) => (
  <Provider key={model.id} model={model} embedded>
    <Viewport showDisplaySwitch={false} />
  </Provider>
);

const Mini = ({ model, focus }: { model: DetailNeuronModelFragment; focus?: readonly string[] | null }) => (
  <Provider key={model.id} model={model} focus={focus} embedded>
    <MiniViewport />
  </Provider>
);

export const MorphologyScene = { Provider, Viewport, LayersSidebar, Embedded, Mini };
