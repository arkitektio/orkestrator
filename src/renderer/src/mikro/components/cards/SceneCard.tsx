import React from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MikroScene } from "@/linkers";
import { ListSceneFragment } from "../../api/graphql";
import { SnapshotBackdrop } from "./SnapshotBackdrop";

interface Props {
  scene: ListSceneFragment;
}

/**
 * A scene is a composition, so its latest snapshot IS the card — the picture
 * identifies it better than the name does. Nothing takes a snapshot on
 * creation, though, so the title sits over the backdrop rather than beside it,
 * and stays legible on a black card when there is no picture under it.
 */
const TheCard = ({ scene }: Props) => {
  return (
    <MikroScene.Smart object={scene}>
      <Card className={cn("aspect-square overflow-hidden p-0")}>
        <SnapshotBackdrop snapshot={scene.latestSnapshot} className="h-full w-full">
          <CardHeader className="h-full">
            <CardTitle>
              <MikroScene.DetailLink object={scene}>
                <h1 className="line-clamp-2 ellipsis">{scene.name}</h1>
                <span className="font-light text-white/70">{scene.id}</span>
              </MikroScene.DetailLink>
            </CardTitle>
          </CardHeader>
        </SnapshotBackdrop>
      </Card>
    </MikroScene.Smart>
  );
};

export default React.memo(TheCard);