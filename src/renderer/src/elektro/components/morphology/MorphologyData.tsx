import { createContext, useContext, useMemo } from "react";
import type {
  CompartmentFragment,
  DetailNeuronModelFragment,
  SectionFragment,
} from "../../api/graphql";
import { type ImportanceColors, useImportanceColors } from "../../lib/importance";
import { buildMorphology, type Morphology } from "./model/buildMorphology";
import { compartmentColors } from "./model/colouring";
import { type Frame, focusFrame, wholeFrame } from "./model/focus";
import { buildNetworkLayout, type NetworkLayout } from "./model/networkLayout";
import { useMorphologyStore } from "./stores/morphologyStore";

/**
 * Everything the viewer derives from the MODEL — rebuilt when the model
 * changes, never by view state (except the importance weights, which refetch).
 * Separate from the store on purpose: the store is what the user changes, this
 * is what the server said.
 */
export type MorphologyData = {
  model: DetailNeuronModelFragment;
  morphology: Morphology;
  network: NetworkLayout;
  /** Compartment id → CSS colour, for the compartments that set one. */
  compartments: Map<string, string>;
  compartmentMap: Record<string, CompartmentFragment>;
  sectionMap: Map<string, SectionFragment>;
  /** Section id → the cell it belongs to (the sessions query is per cell). */
  cellOf: Map<string, string>;
  importance: ImportanceColors;
  /** The zoomed-in render's focus — null for the whole model. */
  focus: ReadonlySet<string> | null;
  /** What the camera frames and orbits: the focus, or the whole model. */
  frame: Frame;
};

const MorphologyDataContext = createContext<MorphologyData | null>(null);

export const useMorphologyData = (): MorphologyData => {
  const data = useContext(MorphologyDataContext);
  if (!data) throw new Error("Missing MorphologyScene.Provider");
  return data;
};

/** Must sit inside the store provider: the importance weights live there. */
export const MorphologyDataProvider = ({
  model,
  focus: focusIds,
  children,
}: {
  model: DetailNeuronModelFragment;
  focus?: readonly string[] | null;
  children: React.ReactNode;
}) => {
  const cells = model.config.cells;
  const morphology = useMemo(() => buildMorphology(cells), [cells]);
  const network = useMemo(
    () => buildNetworkLayout(model.config, morphology),
    [model.config, morphology],
  );
  // By value: a page that rebuilds its id list each render must not re-frame.
  const focusKey = focusIds ? focusIds.join("\u0000") : null;
  const focus = useMemo(
    () => (focusKey === null ? null : new Set(focusKey.split("\u0000"))),
    [focusKey],
  );
  const frame = useMemo(
    () => (focus && focusFrame(morphology, focus)) || wholeFrame(morphology),
    [focus, morphology],
  );
  const weights = useMorphologyStore((s) => s.importanceWeights);
  const importance = useImportanceColors(model, weights);

  const derived = useMemo(
    () => ({
      compartments: compartmentColors(cells),
      compartmentMap: Object.fromEntries(
        cells.flatMap((cell) => cell.biophysics.compartments.map((c) => [c.id, c])),
      ) as Record<string, CompartmentFragment>,
      sectionMap: new Map(
        cells.flatMap((cell) => cell.topology.sections.map((s) => [s.id, s] as const)),
      ),
      cellOf: new Map(
        cells.flatMap((cell) => cell.topology.sections.map((s) => [s.id, cell.id] as const)),
      ),
    }),
    [cells],
  );

  const value = useMemo(
    () => ({ model, morphology, network, importance, focus, frame, ...derived }),
    [model, morphology, network, importance, focus, frame, derived],
  );

  return <MorphologyDataContext.Provider value={value}>{children}</MorphologyDataContext.Provider>;
};
