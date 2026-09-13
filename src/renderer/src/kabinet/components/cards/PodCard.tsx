import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KabinetPod } from "@/linkers";
import { ListPodFragment } from "../../api/graphql";

interface Props {
  item: ListPodFragment;

}

const TheCard = ({ item }: Props) => {
  return (
    <KabinetPod.Smart object={item} >
      <Card className="group aspect-[3/2]">
        <CardHeader className="flex flex-row justify-between">
          <div>
            <CardTitle>
              <KabinetPod.DetailLink object={item}>
                {" "}
                {item.deployment.flavour.release.app.identifier}
                {item.deployment.flavour.release.version}
              </KabinetPod.DetailLink>
            </CardTitle>
            <CardDescription>
              {item.status} {item.backend.name}
              {item.resource && <p>Running on {item.resource.name}</p>}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-row gap-2"></CardContent>
      </Card>
    </KabinetPod.Smart>
  );
};

export default React.memo(TheCard);