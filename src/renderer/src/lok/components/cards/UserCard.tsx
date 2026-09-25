import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/ui/avatar";
import { Card, CardHeader, CardTitle } from "@/core/ui/card";
import { useLokResolve } from "@/core/datalayer/hooks/useResolve";
import { LokUser } from "@/core/linkers";
import { ListUserFragment } from "../../api/graphql";

interface Props {
  item: ListUserFragment;

}

const TheCard = ({ item }: Props) => {
  const resolve = useLokResolve();

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