import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useResolve } from "@/datalayer/hooks/useResolve";
import { LokUser } from "@/linkers";
import { ListUserFragment } from "../../api/graphql";

interface Props {
  item: ListUserFragment;

}

const TheCard = ({ item }: Props) => {
  const resolve = useResolve();

  return (
    <LokUser.Smart object={item}>
      <Card className="p-2">
        <CardHeader className="flex flex-row gap-2">
          <LokUser.DetailLink object={item}>
            <Avatar>
              {item.profile?.avatar?.presignedUrl && (
                <AvatarImage
                  src={resolve(item.profile?.avatar?.presignedUrl)}
                  alt={item.username}
                />
              )}
              <AvatarFallback>{item.username[0]}</AvatarFallback>
            </Avatar>
          </LokUser.DetailLink>
          <CardTitle>
            <LokUser.DetailLink object={item}>
              {item.username}
            </LokUser.DetailLink>
          </CardTitle>
        </CardHeader>
      </Card>
    </LokUser.Smart>
  );
};

export default React.memo(TheCard);