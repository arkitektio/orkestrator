import { Explainer } from "@/components/explainer/Explainer";
import { MikroScene } from "@/linkers";
import React from "react";
import SceneList from "../components/lists/SceneList";

export type IRepresentationScreenProps = {};

const ScenesPage: React.FC<IRepresentationScreenProps> = () => {
  return (
    <MikroScene.ListPage pageActions={<></>} title="Scenes">
      <div className="p-3">
        <Explainer
          title="Scenes"
          description="Scenes are physical spaces where your samples are placed for imaging. They allow you to look at multiple images at once, given their physical positions
          in the scene."
        />
        <SceneList pagination={{ limit: 30 }} />
      </div>
    </MikroScene.ListPage>
  );
};

export default ScenesPage;
