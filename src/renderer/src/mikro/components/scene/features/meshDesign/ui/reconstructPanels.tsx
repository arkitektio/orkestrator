import type { FC } from "react";

import { Toggle } from "@/core/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { useBrushSkeletonStore } from "../brush";
import { ParamRow, SliderRow } from "../../annotations/enhancers/shared/ParamRow";
import { useMeshDesignStore, type ReconstructorId } from "../store/meshDesignStore";

/**
 * The reconstructors' own knobs — one small panel each, keyed by id. A
 * `Record` (not a list) so a reconstructor added to `reconstruct/registry`
 * without a panel fails the build. Panels only edit settings; running,
 * re-running and the verdict belong to `ReconstructPanel`, which hosts them.
 */

/** The search radius every gesture tool shares (the brush store's). */
export const RadiusRow = ({ title }: { title: string }) => {
  const radiusWorld = useBrushSkeletonStore((s) => s.radiusWorld);
  const radiusBounds = useBrushSkeletonStore((s) => s.radiusBounds);
  const setRadiusWorld = useBrushSkeletonStore((s) => s.setRadiusWorld);
  if (radiusWorld === null || radiusBounds === null) return null;
  return (
    <SliderRow
      label="Radius"
      title={title}
      min={radiusBounds[0]}
      max={radiusBounds[1]}
      step={radiusBounds[0] / 4}
      value={radiusWorld}
      readout={radiusWorld.toPrecision(2)}
      onChange={setRadiusWorld}
    />
  );
};

/** Wrap, with the click reconstructors' Auto switch beside the slider. */
const ThresholdRow = ({ auto }: { auto: boolean }) => {
  const tubeThreshold = useBrushSkeletonStore((s) => s.tubeThreshold);
  const setTubeThreshold = useBrushSkeletonStore((s) => s.setTubeThreshold);
  const autoThreshold = useMeshDesignStore((s) => s.reconstructParams.autoThreshold);
  const setParams = useMeshDesignStore((s) => s.setReconstructParams);
  const automatic = auto && autoThreshold;
  return (
    <div className="flex items-center gap-1">
      <SliderRow
        label="Wrap"
        title={
          automatic
            ? "Set from the click: half the clicked brightness. Turn Auto off to choose it yourself"
            : "Brightness threshold the shape wraps — lower includes dimmer voxels"
        }
        min={0.05}
        max={0.95}
        step={0.01}
        value={tubeThreshold}
        readout={automatic ? "auto" : tubeThreshold.toFixed(2)}
        disabled={automatic}
        onChange={setTubeThreshold}
      />
      {auto && (
        <Toggle
          size="sm"
          pressed={autoThreshold}
          onPressedChange={(on) => setParams({ autoThreshold: on })}
          className="h-5 px-1.5 text-[10px]"
          title="Take the threshold from the clicked voxel (half its brightness)"
        >
          Auto
        </Toggle>
      )}
    </div>
  );
};

const BrightRow = () => {
  const intensity = useBrushSkeletonStore((s) => s.weights.intensity);
  const setWeights = useBrushSkeletonStore((s) => s.setWeights);
  return (
    <SliderRow
      label="Bright"
      title="How strongly the centerline is pulled toward bright voxels"
      min={0}
      max={4}
      step={0.05}
      value={intensity}
      readout={intensity.toFixed(2)}
      onChange={(value) => setWeights({ intensity: value })}
    />
  );
};

const TubeFitPanel = () => {
  const params = useMeshDesignStore((s) => s.reconstructParams);
  const setParams = useMeshDesignStore((s) => s.setReconstructParams);
  return (
    <>
      <RadiusRow title="How far around the stroke the structure is searched — set it a little wider than the structure" />
      <SliderRow
        label="Edge"
        title="Where the structure ends: the fraction of its core brightness that still counts as inside. 0.5 is the half-maximum; lower makes the tube wider"
        min={0.2}
        max={0.8}
        step={0.05}
        value={params.tubeEdge}
        readout={params.tubeEdge.toFixed(2)}
        onChange={(value) => setParams({ tubeEdge: value })}
      />
      <SliderRow
        label="Smooth"
        title="Evens the width and the path along the tube — 0 follows every measurement"
        min={0}
        max={8}
        step={1}
        value={params.tubeSmooth}
        readout={params.tubeSmooth.toFixed(0)}
        onChange={(value) => setParams({ tubeSmooth: value })}
      />
      <SliderRow
        label="Scale"
        title="Multiplies the measured width"
        min={0.5}
        max={2}
        step={0.05}
        value={params.tubeScale}
        readout={`${params.tubeScale.toFixed(2)}×`}
        onChange={(value) => setParams({ tubeScale: value })}
      />
      <BrightRow />
    </>
  );
};

const TubeSurfacePanel = () => (
  <>
    <RadiusRow title="How far around the stroke the surface may reach" />
    <ThresholdRow auto={false} />
    <BrightRow />
  </>
);

const BallFitPanel = () => {
  const params = useMeshDesignStore((s) => s.reconstructParams);
  const setParams = useMeshDesignStore((s) => s.setReconstructParams);
  return (
    <>
      <ParamRow label="Shape" title="One radius, or three with an orientation">
        <ToggleGroup
          type="single"
          size="sm"
          value={params.ballShape}
          onValueChange={(value) => {
            if (value) setParams({ ballShape: value as "sphere" | "ellipsoid" });
          }}
        >
          <ToggleGroupItem value="sphere" className="h-5 px-2 text-[10px]">
            sphere
          </ToggleGroupItem>
          <ToggleGroupItem value="ellipsoid" className="h-5 px-2 text-[10px]">
            ellipsoid
          </ToggleGroupItem>
        </ToggleGroup>
      </ParamRow>
      <ThresholdRow auto />
      <SliderRow
        label="Scale"
        title="Multiplies the fitted radii"
        min={0.5}
        max={2}
        step={0.05}
        value={params.ballScale}
        readout={`${params.ballScale.toFixed(2)}×`}
        onChange={(value) => setParams({ ballScale: value })}
      />
    </>
  );
};

const BallSurfacePanel = () => {
  const blobSmoothness = useBrushSkeletonStore((s) => s.blobSmoothness);
  const setBlobSmoothness = useBrushSkeletonStore((s) => s.setBlobSmoothness);
  const blobGap = useBrushSkeletonStore((s) => s.blobGap);
  const setBlobGap = useBrushSkeletonStore((s) => s.setBlobGap);
  return (
    <>
      <ThresholdRow auto />
      <SliderRow
        label="Smooth"
        title="Rounds the surface: blurs the brightness (in voxels) before it is meshed"
        min={0}
        max={4}
        step={1}
        value={blobSmoothness}
        readout={blobSmoothness.toFixed(0)}
        onChange={setBlobSmoothness}
      />
      <SliderRow
        label="Gap"
        title="How wide a dark gap may be (in voxels) and still count as connected — 0 keeps only the structure the click landed on"
        min={0}
        max={8}
        step={1}
        value={blobGap}
        readout={blobGap.toFixed(0)}
        onChange={setBlobGap}
      />
      <RadiusRow title="Starting search radius — the search grows from here until the surface closes" />
    </>
  );
};

export const RECONSTRUCTOR_PANELS: Record<ReconstructorId, FC> = {
  "tube-fit": TubeFitPanel,
  "tube-surface": TubeSurfacePanel,
  "ball-fit": BallFitPanel,
  "ball-surface": BallSurfacePanel,
};
