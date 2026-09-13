import React from "react";
import { Card } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import { useResolve } from "@/datalayer/hooks/useResolve";
import { LokLayer } from "@/linkers";
import { ListLayerFragment } from "../../api/graphql";

interface Props {
  item: ListLayerFragment;

}

const TheCard = ({ item }: Props) => {
  const resolve = useResolve();

  return (
    <LokLayer.Smart object={item} >
      <Card className="p-3">
        <LokLayer.DetailLink object={item} className="">
          {item.name}
          <br />
        </LokLayer.DetailLink>
        {item.logo && <Image src={resolve(item.logo.presignedUrl)} />}
      </Card>
    </LokLayer.Smart>
  );
};

export default React.memo(TheCard);