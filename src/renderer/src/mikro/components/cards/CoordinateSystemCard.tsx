import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { MikroCoordinateSystem } from "@/linkers";
import { ListCoordinateSystemFragment } from "../../api/graphql";
import { occupancyLabel } from "../coordinates/residents";

interface Props {
  system: ListCoordinateSystemFragment;
}

const TheCard = ({ system }: Props) => {
  return (
    <MikroCoordinateSystem.Smart object={system}>
      <Card className="px-2 py-2 aspect-[5/3] flex flex-col justify-between">
        <CardTitle className="line-clamp-2 break-words">
          <MikroCoordinateSystem.DetailLink object={system}>
            {system.name}
          </MikroCoordinateSystem.DetailLink>
        </CardTitle>
        <div>
          <Badge variant="outline" className="text-xs">
            {occupancyLabel(system)}
          </Badge>
        </div>
      </Card>
    </MikroCoordinateSystem.Smart>
  );
};

export default React.memo(TheCard);