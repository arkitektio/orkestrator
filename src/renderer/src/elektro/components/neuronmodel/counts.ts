import { DetailNeuronModelFragment } from "../../api/graphql";

/**
 * How big the model is, in the units the page talks about. Computed once per
 * render of whoever asks (the sidebar, the title overlay); the fragment is
 * small enough that memoising would cost more than the sums.
 */
export const neuronModelCounts = (model: DetailNeuronModelFragment) => {
  const { config } = model;
  return {
    cells: config.cells.length,
    sections: config.cells.reduce(
      (sum, cell) => sum + cell.topology.sections.length,
      0,
    ),
    compartments: config.cells.reduce(
      (sum, cell) => sum + cell.biophysics.compartments.length,
      0,
    ),
    synapses: (config.netSynapses ?? []).length,
    stimulators: (config.netStimulators ?? []).length,
    connections: (config.netConnections ?? []).length,
  };
};
