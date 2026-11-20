import { MikroScene } from "@/core/linkers";
import React from "react";
import SceneList from "../components/lists/SceneList";
import { MIKRO_HELP } from "../help";

export type IRepresentationScreenProps = {};

const ScenesPage: React.FC<IRepresentationScreenProps> = () => {
  return (
    <MikroScene.ListPage pageActions={<></>} title="Scenes" help={MIKRO_HELP.scenes}>
      <div className="p-3">
        <SceneList pagination={{ limit: 30 }} />
      </div>
    </MikroScene.ListPage>
  );
};

export default ScenesPage;
