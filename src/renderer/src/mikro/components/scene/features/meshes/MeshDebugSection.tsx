import { Slider } from "@/core/ui/slider";
import { useState, type FC } from "react";
import { useViewerStore } from "../../platform/stores/viewerStore";
import type { FabriksCollectionManager } from "./fabriks/fabriksManager";
import { useMeshStore, useMeshStoreApi } from "./store/meshSlice";

/**
 * The fabriks mesh renderer's debug-panel entry (`shell/debugRegistry.ts`).
 * Its shape matches `features/debug/debugSection.ts` structurally — this
 * folder may not import that one — and the registry's `Record` checks it.
 */

/** Mounts the section only once a collection has registered its manager, so
 * the controls below seed from a live one (as they always have). */
const MeshDebugBody: FC = () => {
  const meshSystems = useMeshStore((s) => s.meshSystems);
  if (Object.keys(meshSystems).length === 0) return null;
  return <FabriksMeshSection systems={meshSystems} />;
};

const useMeshDebugContribution = () => {
  const api = useMeshStoreApi();
  useMeshStore((s) => s.meshVersion); // refresh fabriks streaming stats
  return {
    report: () => ({
      fabriks: Object.fromEntries(
        Object.entries(api.getState().meshSystems).map(([layerId, manager]) => [
          layerId,
          manager.buildDebugReport(),
        ]),
      ),
    }),
  };
};

export const MESH_DEBUG_SECTION = {
  Body: MeshDebugBody,
  useContribution: useMeshDebugContribution,
};

/**
 * The fabriks mesh renderer's section — the octree section's idiom (chips at
 * streaming cadence, A/B toggles) over `FabriksCollectionManager.stats`.
 *
 * The controls steer EVERY registered collection: the sliders are scene-wide
 * levers like `lodBias`, not per-layer settings. A manager that mounts after a
 * toggle was flipped starts from its defaults — acceptable for a debug tool.
 */
const FabriksMeshSection = ({
  systems,
}: {
  systems: Record<string, FabriksCollectionManager>;
}) => {
  const managers = Object.values(systems);
  const [pixelBudget, setPixelBudget] = useState(
    () => managers[0]?.getPlanConfig().pixelBudget ?? 1,
  );
  const [frozen, setFrozen] = useState(() => managers[0]?.getPlanConfig().frozen ?? false);
  const [showBoxes, setShowBoxes] = useState(() => managers[0]?.getShowCellBoxes() ?? false);
  const [flatNormals, setFlatNormals] = useState(() => managers[0]?.getFlatNormals() ?? true);
  const [batched, setBatched] = useState(() => managers[0]?.getBatching() ?? true);
  const markProbedInstances = useViewerStore((s) => s.markProbedInstances);
  const setMarkProbedInstances = useViewerStore((s) => s.setMarkProbedInstances);

  const applyPixelBudget = (value: number) => {
    setPixelBudget(value);
    for (const manager of managers) manager.setPlanConfig({ pixelBudget: value });
  };
  const toggleFrozen = () => {
    const next = !frozen;
    setFrozen(next);
    for (const manager of managers) manager.setPlanConfig({ frozen: next });
  };
  const toggleBoxes = () => {
    const next = !showBoxes;
    setShowBoxes(next);
    for (const manager of managers) manager.setShowCellBoxes(next);
  };
  const toggleFlatNormals = () => {
    const next = !flatNormals;
    setFlatNormals(next);
    for (const manager of managers) manager.setFlatNormals(next);
  };
  const toggleBatched = () => {
    const next = !batched;
    setBatched(next);
    for (const manager of managers) manager.setBatching(next);
  };

  const mb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="mb-3">
      <h4 className="font-bold border-b border-border/50 pb-1 mb-2">Fabriks Mesh</h4>
      <div className="space-y-1 mb-2">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
          {/* The mesh LOD lever: max screen-space error per cell. 1 px is the
              conservative default; raising it coarsens every region and cuts
              triangle counts roughly with the CUBE of the budget. */}
          <span>Pixel Error Budget</span>
          <span className="font-mono bg-accent px-1 rounded">{pixelBudget.toFixed(2)} px</span>
        </div>
        <Slider
          min={0.5}
          max={8}
          step={0.25}
          value={[pixelBudget]}
          onValueChange={([value]) => applyPixelBudget(value)}
          className="py-1"
        />
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-1 text-[9px]">
        <button
          onClick={toggleFrozen}
          title="Ignore camera settles: the current plan keeps rendering, so it can be inspected from other angles without being replanned away."
          className="px-1 rounded border border-border/50 hover:bg-accent"
        >
          freeze plan: {frozen ? "on" : "off"}
        </button>
        <button
          onClick={toggleBoxes}
          title="Draw every planned cell's catalog bounding box, colored by octree level — one merged LineSegments, not a helper per cell."
          className="px-1 rounded border border-border/50 hover:bg-accent"
        >
          cell boxes: {showBoxes ? "on" : "off"}
        </button>
        <button
          onClick={toggleFlatNormals}
          title="Flat = derivative (per-face) normals in the shader: no normals computed or uploaded, no lighting seams at cell borders. Off = smooth normals computed per cell on the main thread (the pre-Phase-1 path)."
          className="px-1 rounded border border-border/50 hover:bg-accent"
        >
          flat normals: {flatNormals ? "on" : "off"}
        </button>
        <button
          onClick={toggleBatched}
          title="All cells in ONE BatchedMesh (one render object, per-instance culling) vs one Mesh per cell (the pre-Phase-4 path). Remounts from cache; nothing refetches."
          className="px-1 rounded border border-border/50 hover:bg-accent"
        >
          batched: {batched ? "on" : "off"}
        </button>
        <button
          onClick={() => setMarkProbedInstances(!markProbedInstances)}
          title="Probing a voxel whose attribute plans name a mesh collection (a MeshSample plan) marks that instance: highlight + bounding-box hull. Rides the attribute pipeline's settle debounce."
          className="px-1 rounded border border-border/50 hover:bg-accent"
        >
          marked boundary: {markProbedInstances ? "on" : "off"}
        </button>
      </div>
      {Object.entries(systems).map(([layerId, manager]) => {
        const report = manager.buildDebugReport();
        const { stats, lastPlan, transport } = report;
        return (
          <div key={layerId} className="mb-2">
            <div className="font-semibold text-[10px] text-muted-foreground uppercase opacity-80 mb-0.5">
              {layerId}
            </div>
            {lastPlan ? (
              <div className="flex flex-wrap items-center gap-1 text-[9px]">
                <span className="bg-accent px-1 rounded">
                  {report.mountedCells}/{lastPlan.cellCount} cells
                </span>
                {Object.entries(lastPlan.byLevel).map(([level, count]) => (
                  <span key={level} className="px-1 rounded border border-border/50">
                    L{level}×{count}
                  </span>
                ))}
                <span className="px-1 rounded border border-border/50">
                  {(lastPlan.totalIndices / 3 / 1e6).toFixed(2)} Mtri
                </span>
                {lastPlan.coarsenedRegions > 0 && (
                  <span className="px-1 rounded border border-amber-500/50 text-amber-300">
                    coarsened {lastPlan.coarsenedRegions}
                  </span>
                )}
              </div>
            ) : (
              <div className="text-[9px] text-muted-foreground">no plan yet</div>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-1 text-[9px] text-muted-foreground">
              <span className="px-1 rounded border border-border/50">plans {stats.plans}</span>
              <span className="px-1 rounded border border-border/50">
                cache {report.cache.cells} / {mb(report.cache.bytes)} MB
              </span>
              {report.batch && (
                <span className="px-1 rounded border border-border/50">
                  batch {(report.batch.usedVertices / 1e6).toFixed(1)}/
                  {(report.batch.capacityVertices / 1e6).toFixed(1)} Mvtx
                  {report.batch.rebuilds > 1 ? ` · rebuilt ${report.batch.rebuilds}` : ""}
                  {report.batch.optimizes > 0 ? ` · packed ${report.batch.optimizes}` : ""}
                </span>
              )}
              {transport && (
                <span className="px-1 rounded border border-border/50">
                  GET {transport.gets} · {mb(transport.bytesFetched)} MB
                  {transport.gets > 0
                    ? ` · ${(transport.fetchMs / transport.gets).toFixed(0)} ms`
                    : ""}
                </span>
              )}
              {transport && transport.cacheHits > 0 && (
                <span className="px-1 rounded border border-border/50">
                  hits {transport.cacheHits}
                </span>
              )}
              {/* streamMs brackets fetch+parse+decode; buildMs is geometry
                  assembly, normalsMs the computeVertexNormals share of it —
                  the main-thread jank suspects, kept separately visible. */}
              <span className="px-1 rounded border border-border/50">
                stream {stats.streamMs.toFixed(0)} ms
              </span>
              <span className="px-1 rounded border border-border/50">
                build {stats.buildMs.toFixed(0)} ms (normals {stats.normalsMs.toFixed(0)})
              </span>
              {stats.completeMs > 0 && (
                <span className="px-1 rounded border border-border/50">
                  sharp {(stats.completeMs / 1000).toFixed(2)} s
                </span>
              )}
              {stats.abortedDrains > 0 && (
                <span className="px-1 rounded border border-border/50">
                  aborted {stats.abortedDrains}
                </span>
              )}
              {/* Placement-change index rebuilds. A steadily climbing count
                  means something is churning matrices that should be
                  value-stable — the exact failure Phase 1 removed. */}
              {stats.indexRebuilds > 1 && (
                <span className="px-1 rounded border border-amber-500/50 text-amber-300">
                  rebuilds {stats.indexRebuilds}
                </span>
              )}
              {(stats.fetchErrors > 0 || (transport?.errors ?? 0) > 0) && (
                <span className="px-1 rounded border border-red-500/50 text-red-300">
                  errors {stats.fetchErrors + (transport?.errors ?? 0)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
