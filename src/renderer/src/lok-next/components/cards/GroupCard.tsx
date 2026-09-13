import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { useResolve } from "@/datalayer/hooks/useResolve";
import { LokGroup } from "@/linkers";
import { ListGroupFragment } from "../../api/graphql";

interface Props {
  item: ListGroupFragment;

}

const TheCard = ({ item }: Props) => {
  const resolve = useResolve();

  return (
    <LokGroup.Smart object={item} >
      <Card className="px-2 py-2 h-16">
        <LokGroup.DetailLink object={item} className="text-lg flex flex-col">
          <Avatar className="my-auto mr-3">
            <AvatarImage src={resolve(item.profile?.avatar?.presignedUrl)} />
            <AvatarFallback>{item.name[0]}</AvatarFallback>
          </Avatar>
          <div className="my-auto ">{item.name}</div>
        </LokGroup.DetailLink>
      </Card>
    </LokGroup.Smart>
  );
};

export default React.memo(TheCard);