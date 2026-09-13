import React from "react";
import { Card } from "@/components/ui/card";
import { ListMetricKindFragment } from "@/kraph/api/graphql";
import { KraphMetricKind } from "@/linkers";

interface Props {
  item: ListMetricKindFragment;
}

const TheCard = ({ item }: Props) => {

  return (
    <KraphMetricKind.Smart object={item}>
      <Card className="px-2 py-2 aspect-square transition-all ease-in-out duration-200 truncate relative">
        <div className="p-3 h-full w-full absolute top-0 left-0 bg-opacity-20  hover:bg-opacity-10 transition-all ease-in-out duration-200 flex flex-col break-all overflow-y-hidden">
          <KraphMetricKind.DetailLink
            className={({ isActive } /*  */) =>
              "z-10 font-bold text-md mb-2 cursor-pointer " +
              (isActive ? "text-primary-300" : "")
            }
            object={item}
          >
            {item?.label || item?.key} {item.valueKind && `(${item.valueKind})`}
          </KraphMetricKind.DetailLink>
          <p className="text-sm text-muted-foreground">{item?.structureKind?.identifier}</p>
        </div>
      </Card>
    </KraphMetricKind.Smart>
  );
};

export default React.memo(TheCard);