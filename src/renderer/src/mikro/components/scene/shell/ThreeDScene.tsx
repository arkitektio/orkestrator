import { SceneVolume } from "./SceneVolume";
import { BrushStrokeSession } from "../features/annotations/enhancers/paths/brushSkeleton/BrushStrokeSession";
import { MeshDesignSession } from "../features/meshDesign/ui/MeshDesignSession";
import { DoubleClickRecenter } from "../features/probe/DoubleClickRecenter";
import { ProbeAxisGuides } from "../features/probe/ProbeAxisGuides";
import { RoiDrawer } from "../features/annotations/RoiDrawer";
import { VolumeCompositor } from "../features/volume/VolumeCompositor";

export const ThreeDScene = () => {
  return (
    <>
      {/* The compositor takes over rendering with a priority-1 useFrame. It
          used to sit behind `orkestrator.volumeTarget`, read once per mount
          because flipping it mid-session would move render-loop ownership
          under R3F's feet. The flag is gone (OCTREE_RENDERER.md §6.9); the
          compositor is simply always mounted in 3D. */}
      <VolumeCompositor />
      {/* NAVIGATE double-click → recenter on the clicked content (3D-only by
          construction: this component tree only mounts in 3D). */}
      <DoubleClickRecenter />
      <SceneVolume />
      {/* Axis guides through the probed point — probing and 3D annotating are
          both probe-driven, so the guides serve as the anchor preview too. */}
      <ProbeAxisGuides />
      {/* No RectangleDrawer: the marquee is 2D-only, and the toolbar hides its
          tool in 3D — mounting it here only ever rendered null. */}
      <RoiDrawer />
      {/* The skeleton brush's session: stroke/centerline previews, controls
          suspension, extraction trigger. The capture itself lives in
          BrickVolumeLayer's pointer handlers. */}
      <BrushStrokeSession />
      {/* The mesh designer's session meshes — mutable overlays, DESIGN only. */}
      <MeshDesignSession />
    </>
  );
};
