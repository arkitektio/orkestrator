import { BrushStrokeSession } from "../features/annotations/enhancers/paths/brushSkeleton/BrushStrokeSession";
import { ScenePlane } from "./ScenePlane";
import { SceneProbedPoint2D } from "./SceneProbedPoint2D";
import { RectangleDrawer } from "../features/annotations/RectangleDrawer";
import { RoiDrawer } from "../features/annotations/RoiDrawer";

export const TwoDScene = () => {
  return (
    <>
      <ScenePlane />
      <SceneProbedPoint2D />
      <RectangleDrawer />
      <RoiDrawer />
      {/* The design tools' click gestures land on the 2D plane too (label lift); the session runs their extraction. */}
      <BrushStrokeSession />
    </>
  );
};
