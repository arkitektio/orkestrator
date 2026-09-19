import { createContext, useContext, useMemo } from "react";
import type {
  CompartmentFragment,
  DetailNeuronModelFragment,
  SectionFragment,
} from "../../api/graphql";
import { type ImportanceColors, useImportanceColors } from "../../lib/importance";
import { buildMorphology, type Morphology } from "./model/buildMorphology";
import { compartmentColors } from "./model/colouring";
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
  children,
}: {
  model: DetailNeuronModelFragment;
  children: React.ReactNode;
}) => {
  const cells = model.config.cells;
  const morphology = useMemo(() => buildMorphology(cells), [cells]);
  const network = useMemo(
    () => buildNetworkLayout(model.config, morphology),
    [model.config, morphology],
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
    () => ({ model, morphology, network, importance, ...derived }),
    [model, morphology, network, importance, derived],
  );

  return <MorphologyDataContext.Provider value={value}>{children}</MorphologyDataContext.Provider>;
};
