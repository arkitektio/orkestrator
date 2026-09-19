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
 *
 * Key the Provider on the model id: the store and the geometry belong to one
 * model, so navigating remounts rather than feeding a new model into a viewer
 * primed for the old one.
 */

const PhaseContext = createContext<WebGPUGate>({ phase: "checking", message: null });

const Provider = ({
  model,
  embedded = false,
  children,
}: {
  model: DetailNeuronModelFragment;
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
        <MorphologyDataProvider model={model}>{children}</MorphologyDataProvider>
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
const MorphologyView = () => {
  const { model, morphology, network, compartments, importance, cellOf, sectionMap, compartmentMap } =
    useMorphologyData();
  const colorBy = useMorphologyStore((s) => s.morphology.colorBy);
  const uniform = useMorphologyStore((s) => s.morphology.uniformColor);
  const store = useMorphologyStoreApi();
  const nodes = useRef<Map<string, HTMLDivElement>>(new Map());

  const baseColors = useMemo(
    () =>
      sectionColors(morphology, {
        colorBy,
        compartments,
        importance: importance.hasData ? importance.colors : null,
        uniform,
      }),
    [morphology, colorBy, compartments, importance, uniform],
  );

  return (
    <>
      <MorphologyCanvas morphology={morphology}>
        <SectionTubes
          morphology={morphology}
          baseColors={baseColors}
          onSectionClick={(hit, e) => {
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
        <PanelProjector nodes={nodes} />
      </MorphologyCanvas>

      <PanelOverlay
        modelId={model.id}
        cellOf={cellOf}
        sectionMap={sectionMap}
        compartmentMap={compartmentMap}
        nodes={nodes}
      />
      <MorphologyScaleBar />
      <CloseAllPanels />
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

const LayersSidebar = () => <MorphologyLayerCards />;

const Embedded = ({ model }: { model: DetailNeuronModelFragment }) => (
  <Provider key={model.id} model={model} embedded>
    <Viewport showDisplaySwitch={false} />
  </Provider>
);

export const MorphologyScene = { Provider, Viewport, LayersSidebar, Embedded };
