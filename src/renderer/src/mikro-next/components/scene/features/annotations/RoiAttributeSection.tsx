import { useMemo } from "react";
import { useAttributesAt } from "@/mikro-next/lib/attributes/AttributeServiceProvider";
import {
  buildRoiLookupTargets,
  roiLookupPoints,
  type RoiLookupTarget,
} from "./roiAttributeLookup";
import type { SelectedRoi } from "./roiSelectionStore";
import { HopBlocks } from "../../platform/layerui/AttributeRowsSection";
import { useViewerStore } from "../../platform/stores/viewerStore";

/**
 * "What is under this ROI?" — attribute-plan rows for a selected annotation,
 * looked up at a sparse kind-aware set of representative points (see
 * `features/annotations/roiAttributeLookup.ts`) in the collection's own coordinate system.
 * One `useAttributesAt` per point keeps the lookups bounded (≤5) and
 * abortable; the service caches per point, so re-selecting is free.
 */

const RoiTargetAttributes = ({
  target,
  showLabel,
}: {
  target: RoiLookupTarget;
  showLabel: boolean;
}) => {
  const selection = useViewerStore((s) => s.attributeSelection);
  const { status, results, error } = useAttributesAt({
    systemId: target.systemId,
    coords: target.coords,
    selection,
  });

  if (status === "idle") return null;

  const label = showLabel ? (
    <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-white/40">
      {target.label}
    </span>
  ) : null;

  if (status === "loading") {
    return (
      <div className="flex items-center gap-1.5">
        {label}
        <span className="text-[10px] text-white/40">…</span>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex items-center gap-1.5">
        {label}
        <span className="text-[10px] text-red-300/70">{error ?? "lookup failed"}</span>
      </div>
    );
  }

  // Unreachable hops are honest absences; a system with no reachable tables
  // renders nothing at all (plansFor negative-caches the empty answer).
  const shown = results.filter((result) => result.state.status !== "unreachable");
  if (shown.length === 0) return null;

  return (
    <div className="space-y-1">
      {label}
      <HopBlocks blocks={shown.map((result) => ({ meta: result, state: result.state }))} />
    </div>
  );
};

export const RoiAttributeSection = ({ roi }: { roi: SelectedRoi }) => {
  const targets = useMemo(() => {
    if (!roi.systemId) return [];
    return buildRoiLookupTargets({
      systemId: roi.systemId,
      axisNames: roi.axisNames,
      coordinates: roi.coordinates,
      points: roiLookupPoints(roi.kind, roi.vectors),
    });
  }, [roi.systemId, roi.axisNames, roi.coordinates, roi.kind, roi.vectors]);

  if (targets.length === 0) return null;

  const showLabels = targets.length > 1;
  return (
    <div className="mt-2 space-y-1.5">
      {targets.map((target) => (
        <RoiTargetAttributes key={target.key} target={target} showLabel={showLabels} />
      ))}
    </div>
  );
};
