import { Slider } from "@/core/ui/slider";
import { useState, type FC } from "react";
import { useViewerStore } from "../../platform/stores/viewerStore";
import {
  getDecodeCacheOverrideBytes,
  getDecodedChunkCacheBytes,
  setDecodeCacheOverrideMB,
} from "./octree/poolBudget";
import { useBrickStore, useBrickStoreApi } from "./store/brickSlice";

/**
 * The octree renderer's debug-panel entry (`shell/debugRegistry.ts`).
 *
 * Its types match `features/debug/debugSection.ts` structurally — this folder
 * may not import that one — and the registry's `Record` is where they are
 * checked.
 */

type SelfTest = {
  id: string;
  label: string;
  title: string;
  run: (report: (line: string) => void) => void;
};

const MB = 1024 * 1024;

/** Layers whose coarsest level alone overflows the pool budget. */
const BrickDebugWarnings: FC = () => {
  const unplannableLayers = useBrickStore((s) => s.unplannableLayers);
  return (
    <>
      {Object.entries(unplannableLayers).map(([layerId, info]) => (
        <div
          key={layerId}
          className="mb-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200"
        >
          {layerId}: not planned in {info.mode} — coarsest-level pool floor{" "}
          {(info.floorBytes / MB).toFixed(0)} MB exceeds{" "}
          {(info.capBytes / MB).toFixed(0)} MB budget (no usable pyramid)
        </div>
      ))}
    </>
  );
};

const BrickDebugControls: FC = () => {
  const lodBias = useBrickStore((s) => s.lodBias);
  const setLodBias = useBrickStore((s) => s.setLodBias);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
        <span>LOD Aggressiveness</span>
        <span className="font-mono bg-accent px-1 rounded">{lodBias.toFixed(1)}x</span>
      </div>
      <Slider
        min={0.1}
        max={5.0}
        step={0.1}
        value={[lodBias]}
        onValueChange={([value]) => setLodBias(value)}
        className="py-1"
      />
    </div>
  );
};

/**
 * Node plans + residency. It also draws the self-test row for EVERY section
 * (the annotation skeleton test included): the row has always sat here, gated
 * on a live brick system, because each test runs against its renderer.
 */
const BrickDebugBody: FC<{ selfTests: readonly SelfTest[] }> = ({ selfTests }) => {
  const nodePlans = useBrickStore((s) => s.nodePlans);
  const brickSystem = useBrickStore((s) => s.brickSystem);
  // Applied drawing-buffer DPR (CanvasSync re-registers the canvas on every
  // dpr change, so this chip tracks the interaction ladder live).
  const canvasDpr = useViewerStore((s) => s.canvas?.dpr);
  const [gpuSelfTest, setGpuSelfTest] = useState<string | null>(null);

  if (Object.keys(nodePlans).length === 0) return null;

  return (
    <div className="mb-3">
      <h4 className="font-bold border-b border-border/50 pb-1 mb-2">Octree Node Plans</h4>
      {brickSystem && (
        <div className="mb-2 flex flex-wrap gap-1 text-[9px] text-muted-foreground">
          <span className="px-1 rounded border border-border/50">
            fetched {brickSystem.stats.bricksFetched}
          </span>
          <span className="px-1 rounded border border-border/50">
            uploaded {brickSystem.stats.bricksUploaded}
          </span>
          <span className="px-1 rounded border border-border/50">
            decoded {(brickSystem.stats.bytesDecoded / MB).toFixed(0)} MB
          </span>
          <span className="px-1 rounded border border-border/50">
            repack {brickSystem.stats.repackMs.toFixed(0)} ms
          </span>
          {/* Bricks, mean batch size, and the WORST submit→readback round
              trip. Deliberately not the latency SUM ÷ bricks — flushes
              overlap, so that ratio reads as tens of ms per brick while the
              real main-thread cost is the "upload" chip below. */}
          {brickSystem.stats.gpuBricks > 0 && (
            <span className="px-1 rounded border border-border/50">
              gpu {brickSystem.stats.gpuBricks} /{" "}
              {brickSystem.stats.gpuRepackFlushes > 0
                ? (brickSystem.stats.gpuBricks / brickSystem.stats.gpuRepackFlushes).toFixed(1)
                : "0"}
              /batch / {brickSystem.stats.gpuRepackLatencyMaxMs.toFixed(0)} ms peak
            </span>
          )}
          {/* Per-brick texSubImage3D cost — the P19 signal (≪1 ms on a
              dGPU; ~17 ms on ANGLE-Metal integrated GPUs). */}
          <span className="px-1 rounded border border-border/50">
            upload{" "}
            {brickSystem.stats.bricksUploaded > 0
              ? (brickSystem.stats.uploadMs / brickSystem.stats.bricksUploaded).toFixed(1)
              : "–"}{" "}
            ms/brick
          </span>
          <span className="px-1 rounded border border-border/50">
            evict {brickSystem.stats.evictions}
          </span>
          {/* Zero-referrer queued decodes cancelled before wasting a
              worker slot — climbs during fast navigation. */}
          {brickSystem.stats.cancelledDecodes > 0 && (
            <span className="px-1 rounded border border-border/50">
              cancelled {brickSystem.stats.cancelledDecodes}
            </span>
          )}
          {/* Wall-clock plan→drained (fetchMs/repackMs are concurrent SUMS
              and overstate wall time — judge streaming perf by this). */}
          {brickSystem.stats.timeToSharpMs > 0 && (
            <span className="px-1 rounded border border-border/50">
              sharp {(brickSystem.stats.timeToSharpMs / 1000).toFixed(2)} s
            </span>
          )}
          {brickSystem.stats.fetchErrors > 0 && (
            <span className="px-1 rounded border border-red-500/50 text-red-300">
              errors {brickSystem.stats.fetchErrors}
            </span>
          )}
        </div>
      )}
      {brickSystem && (
        <div className="mb-2 flex flex-wrap items-center gap-1 text-[9px]">
          {/* The kill switches that used to live here are gone: every
              optimisation they gated is now unconditional. See
              OCTREE_RENDERER.md "Settled flags" for the list and for what
              to revert first if a regression shows up. */}
          {typeof canvasDpr === "number" && (
            <span className="px-1 rounded border border-border/50 text-muted-foreground">
              dpr {canvasDpr.toFixed(2)}
            </span>
          )}
          {selfTests.map((test) => (
            <button
              key={test.id}
              onClick={() => test.run(setGpuSelfTest)}
              title={test.title}
              className="px-1 rounded border border-border/50 hover:bg-accent"
            >
              {test.label}
            </button>
          ))}
          {gpuSelfTest && <span className="basis-full text-muted-foreground">{gpuSelfTest}</span>}
        </div>
      )}
      {Object.entries(nodePlans).map(([layerId, plan]) => {
        const countsByLevel = plan.nodes.reduce<Record<number, number>>((acc, node) => {
          acc[node.level] = (acc[node.level] ?? 0) + 1;
          return acc;
        }, {});
        const pool = brickSystem?.getLayerPool(layerId) ?? null;
        return (
          <div key={layerId} className="mb-2">
            <div className="font-semibold text-[10px] text-muted-foreground uppercase opacity-80 mb-0.5">
              {layerId}
            </div>
            <div className="flex flex-wrap items-center gap-1 text-[9px]">
              <span className="bg-accent px-1 rounded">{plan.mode}</span>
              <span className="bg-accent px-1 rounded">target L{plan.targetLevel}</span>
              <span className="bg-accent px-1 rounded">floor L{plan.budgetMinLevel}</span>
              {/* Slot currency: 0 refine bytes = pinned at the coarsest
                  level regardless of zoom (P25). */}
              <span
                className="bg-accent px-1 rounded"
                title={`plan budget ${(plan.planBudgetBytes / MB).toFixed(1)} MB, of which refinement may spend ${(plan.refineBudgetBytes / MB).toFixed(1)} MB`}
              >
                refine {(plan.refineBudgetBytes / MB).toFixed(1)} MB
              </span>
              {/* The floor's own arithmetic, inline: L0 needs X, floor allows Y. */}
              <span
                className="ml-1 opacity-70"
                title={plan.levelDecodeBytes
                  .map(
                    (bytes, level) =>
                      `L${level}: ${(bytes / MB).toFixed(0)} MB${
                        bytes <= plan.decodeFloorBytes ? " (fits)" : ""
                      }`,
                  )
                  .join("\n")}
              >
                floor {(plan.decodeFloorBytes / MB).toFixed(0)} MB
                {plan.levelDecodeBytes[0] !== undefined &&
                  ` · L0 needs ${(plan.levelDecodeBytes[0] / MB).toFixed(0)} MB`}
              </span>
              {plan.decodeBytesCharged > 0 && (
                <span className="bg-accent px-1 rounded">
                  {(plan.decodeBytesCharged / MB).toFixed(0)} MB decode
                </span>
              )}
              {plan.slabZ !== null && (
                <span className="bg-accent px-1 rounded">slab z {plan.slabZ}</span>
              )}
              <span className="bg-accent px-1 rounded">{(plan.planBytes / MB).toFixed(1)} MB</span>
              {Object.entries(countsByLevel).map(([level, count]) => (
                <span key={level} className="px-1 rounded border border-border/50">
                  L{level}×{count}
                </span>
              ))}
              {pool && (
                <>
                  <span className="px-1 rounded border border-border/50">
                    slots {pool.pool.size}/{pool.pool.capacity}
                  </span>
                  <span className="px-1 rounded border border-border/50">
                    empty {pool.emptyValues.size}
                  </span>
                  {(pool.queue.length > 0 || pool.inFlight.size > 0) && (
                    <span className="px-1 rounded border border-amber-500/50 text-amber-300">
                      ↓{pool.inFlight.size} ⇡{pool.queue.length}
                    </span>
                  )}
                  {pool.provisionalKeys.size > 0 && (
                    <span
                      className="px-1 rounded border border-sky-500/50 text-sky-300"
                      title="Two-phase bricks: residents whose 1-voxel border is still edge-replicated (halo refine pending)"
                    >
                      ◐{pool.provisionalKeys.size}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const useBrickDebugContribution = () => {
  const api = useBrickStoreApi();
  useBrickStore((s) => s.residencyVersion); // refresh residency stats

  const parity: SelfTest = {
    id: "bricks.repackParity",
    label: "parity self-test",
    title: "Repack one synthetic brick on GPU and CPU; compare voxel-for-voxel.",
    run: (report) => {
      const manager = api.getState().brickSystem;
      if (!manager) return;
      report("running…");
      void manager.runGpuRepackSelfTest().then((result) => {
        report(`${result.supported ? (result.pass ? "PASS" : "FAIL") : "n/a"} — ${result.detail}`);
      });
    },
  };

  const report = () => {
    const state = api.getState();
    return {
      lodBias: state.lodBias,
      budget: {
        decodeCacheBytes: getDecodedChunkCacheBytes(),
        decodeCacheOverrideBytes: getDecodeCacheOverrideBytes(),
      },
      // Full-screen volume raymarch passes per frame. With merging OFF this is
      // one per 3D-planned layer. With it ON, co-pool layers collapse into one
      // pass each, so the real count is the number of merge GROUPS — at least
      // `brickSystem.poolCount` and at most `layers` (a group splits when
      // members disagree on transform or overflow the uniform budget).
      volumePasses: {
        layers: Object.values(state.nodePlans).filter((p) => p.mode === "3D").length,
      },
      plans: Object.fromEntries(
        Object.entries(state.nodePlans).map(([layerId, plan]) => {
          const byLevelRole: Record<string, number> = {};
          for (const node of plan.nodes) {
            const bucket = `L${node.level}:${node.role}`;
            byLevelRole[bucket] = (byLevelRole[bucket] ?? 0) + 1;
          }
          return [
            layerId,
            {
              mode: plan.mode,
              targetLevel: plan.targetLevel,
              budgetMinLevel: plan.budgetMinLevel,
              decodeBytesCharged: plan.decodeBytesCharged,
              // The budget floor's own arithmetic, so "why is level N never
              // selected?" is readable off the report instead of re-derived.
              levelDecodeBytes: plan.levelDecodeBytes,
              decodeFloorBytes: plan.decodeFloorBytes,
              decodeAllowanceBytes: plan.decodeAllowanceBytes,
              // The SLOT budget the same question needs (refineBudgetBytes 0 =
              // no refinement was possible at any zoom).
              planBudgetBytes: plan.planBudgetBytes,
              refineBudgetBytes: plan.refineBudgetBytes,
              slabZ: plan.slabZ,
              planBytes: plan.planBytes,
              nodeCount: plan.nodes.length,
              byLevelRole,
            },
          ];
        }),
      ),
      brickSystem: state.brickSystem?.buildDebugReport() ?? null,
    };
  };

  return { selfTests: [parity], report };
};

export const BRICK_DEBUG_SECTION = {
  Warnings: BrickDebugWarnings,
  budgets: [
    {
      label: "Decode cache (heap)",
      title:
        "Decoded-chunk cache. This is what the LOD FLOOR is derived from: a level is only unlocked if its chunk working set fits. Raise it when a level you expect is never selected on a plane-chunked pyramid. The same setting as Settings → Renderer; the cache itself is resized at the next restart.",
      get: getDecodeCacheOverrideBytes,
      setMB: setDecodeCacheOverrideMB,
    },
  ],
  Controls: BrickDebugControls,
  Body: BrickDebugBody,
  useContribution: useBrickDebugContribution,
};
