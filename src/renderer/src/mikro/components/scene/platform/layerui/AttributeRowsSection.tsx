import { useMemo } from "react";
import {
  AttributePlanBlock as BaseAttributePlanBlock,
  FollowReferenceContext,
  HopBlocks as BaseHopBlocks,
  formatCell,
  profileLabelsFor,
  type HopBlock,
} from "@/mikro/lib/attributes/ui/AttributeBlocks";
import type { ProbeResult } from "../probe/probeTypes";
import { isSameProbeKey } from "../probe/probeTypes";
import { useViewerStore } from "../stores/viewerStore";
import { perfMonitor } from "../perf/perfMonitor";

export { formatCell, profileLabelsFor, type HopBlock };

/**
 * "What is under this pixel?" — the probe HUD section rendering the active
 * probe's attribute-plan results. Pure store consumer: all data arrives via
 * `probedAttributes` (written by AttributeProbeTracker), so no GraphQL hook
 * mounts here and no extra Guard is needed.
 *
 * The blocks themselves are `@/mikro/lib/attributes/ui` (a chart's probe draws
 * the same ones); these wrappers hand them the scene's reference follow-up.
 */

const SceneFollow = ({ children }: { children: React.ReactNode }) => {
  const follow = useViewerStore((s) => s.followAttributeReference);
  return <FollowReferenceContext.Provider value={follow}>{children}</FollowReferenceContext.Provider>;
};

export const AttributePlanBlock = (props: React.ComponentProps<typeof BaseAttributePlanBlock>) => (
  <SceneFollow>
    <BaseAttributePlanBlock {...props} />
  </SceneFollow>
);

export const HopBlocks = (props: React.ComponentProps<typeof BaseHopBlocks>) => (
  <SceneFollow>
    <BaseHopBlocks {...props} />
  </SceneFollow>
);

export const AttributeRowsSection = ({ probe }: { probe: ProbeResult }) => {
  perfMonitor.countRender("AttributeRowsSection"); // no-op unless a perf recording is armed
  // This reading's layer's rows only: another layer settling does not
  // re-render this one.
  const probedAttributes = useViewerStore((s) => s.probedAttributes[probe.layerId] ?? null);

  const blocks = useMemo<readonly HopBlock[]>(() => {
    if (!probedAttributes) return [];
    return Object.keys(probedAttributes.byPlan).flatMap((hopKey) => {
      const meta = probedAttributes.planMeta[hopKey];
      return meta ? [{ meta, state: probedAttributes.byPlan[hopKey] }] : [];
    });
  }, [probedAttributes]);

  if (!probedAttributes || !isSameProbeKey(probe, probedAttributes.key)) return null;
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-1">
      <HopBlocks blocks={blocks} />
    </div>
  );
};
