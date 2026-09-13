import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { LokRedeemToken } from "@/linkers";
import { ListRedeemTokenFragment } from "../../api/graphql";
import { clientAppVersion } from "@/lok-next/lib/clientLabels";

interface Props {
  item: ListRedeemTokenFragment;

}

const TheCard = ({ item }: Props) => {
  return (
    <LokRedeemToken.Smart object={item} >
      <Card>
        <LokRedeemToken.DetailLink
          object={item}
          className="px-2 py-2 h-full w-full bg-opacity-20 bg-back-999 hover:bg-opacity-10 transition-all ease-in-out duration-200 truncate flex flex-row"
        >
          <Avatar className="my-auto mr-3">
            <AvatarFallback>{item.user.id}</AvatarFallback>
          </Avatar>
          {item.token}
          <div className="my-auto ">{item.user.id}</div>
          {item.client && <> Claimed</>}
          {item.client && (
            <div className="my-auto">
              {clientAppVersion(item.client)}
            </div>
          )}
        </LokRedeemToken.DetailLink>
      </Card>
    </LokRedeemToken.Smart>
  );
};

export default React.memo(TheCard);