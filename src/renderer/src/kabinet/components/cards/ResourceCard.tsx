import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KabinetResource } from "@/linkers";
import { ListResourceFragment } from "../../api/graphql";

interface Props {
  item: ListResourceFragment;

}

const TheCard = ({ item }: Props) => {
  return (
    <KabinetResource.Smart object={item} >
      <Card className="group">
        <CardHeader className="flex flex-row justify-between">
          <div>
            <CardTitle>
              <KabinetResource.DetailLink object={item}>
                {" "}
                {item.name}
              </KabinetResource.DetailLink>
            </CardTitle>
            <CardDescription>{item.backend.name}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-row gap-2"></CardContent>
      </Card>
    </KabinetResource.Smart>
  );
};

export default React.memo(TheCard);