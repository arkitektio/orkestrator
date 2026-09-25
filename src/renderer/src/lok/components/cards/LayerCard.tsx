import React from "react";
import { Card } from "@/core/components/ui/card";
import { Image } from "@/core/components/ui/image";
import { useLokResolve } from "@/core/datalayer/hooks/useResolve";
import { LokLayer } from "@/core/linkers";
import { ListLayerFragment } from "../../api/graphql";

interface Props {
  item: ListLayerFragment;

}

const TheCard = ({ item }: Props) => {
  const resolve = useLokResolve();

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