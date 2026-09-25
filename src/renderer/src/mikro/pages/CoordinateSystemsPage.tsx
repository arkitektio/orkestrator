import { Explainer } from "@/components/explainer/Explainer";
import { MikroCoordinateSystem } from "@/linkers";
import React from "react";
import CoordinateSystemList from "../components/lists/CoordinateSystemList";

export type ICoordinateSystemsScreenProps = {};

const Page: React.FC<ICoordinateSystemsScreenProps> = () => {
  return (
    <MikroCoordinateSystem.ListPage title="Coordinate Systems">
      <div className="p-3">
        <Explainer
          title="Coordinate Systems"
          description="The nodes of the transformation graph: a dataset's intrinsic pixel grid, the calibrated physical spaces derived from it, the voxel space of a pyramid level, and the world space a scene registers its layers into."
        />
        <CoordinateSystemList pagination={{ limit: 30 }} />
      </div>
    </MikroCoordinateSystem.ListPage>
  );
};

export default Page;
