import { AnnotationsPanel } from "../../features/annotations/AnnotationsPanel";
import {
  ExperimentGuard,
  phaseMessage,
  useExperimentScopeStatus,
} from "../../platform/stores/experimentScope";
import { LayerControlPanel } from "../layerPanel/LayerControlPanel";

/**
 * The experiment's rail tabs. Each is the same shape as mikro's scene tabs:
 * `<ExperimentGuard fallback={…}><Body variant="sidebar"/></ExperimentGuard>`.
 *
 * The rail lives for the page's whole lifetime and so sees every phase — which is
 * why the fallback reads the phase and words it: a missing WebGPU adapter is an
 * environment problem and must not say "failed to load", and an experiment with no
 * world is a fact about the data, not an error.
 */
const SidebarFallback = () => {
  const status = useExperimentScopeStatus();
  return <div className="p-4 text-xs text-muted-foreground">{phaseMessage(status)}</div>;
};

export const ExperimentLayersSidebar = () => (
  <ExperimentGuard fallback={<SidebarFallback />}>
    <LayerControlPanel variant="sidebar" />
  </ExperimentGuard>
);

export const ExperimentAnnotationsSidebar = () => (
  <ExperimentGuard fallback={<SidebarFallback />}>
    <AnnotationsPanel />
  </ExperimentGuard>
);
