import React from "react";
import { Card } from "@/core/components/ui/card";
import { Image } from "@/core/components/ui/image";
import { useLokResolve } from "@/core/datalayer/hooks/useResolve";
import { LokApp } from "@/core/linkers";
import { ListAppFragment } from "../../api/graphql";

interface Props {
  item: ListAppFragment;

}

const TheCard = ({ item }: Props) => {
  const resolve = useLokResolve();

  return (
    <LokApp.Smart object={item} >
      <Card className="p-3 truncate">
        <LokApp.DetailLink object={item} className="">
          {item.identifier}
          <br />
        </LokApp.DetailLink>
        {item.logo && <Image src={resolve(item.logo.presignedUrl)} />}
      </Card>
    </LokApp.Smart>
  );
};

export default React.memo(TheCard);