import React from "react";
import { Card } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import { ListStructureKindFragment } from "@/kraph/api/graphql";
import { KraphStructureKind } from "@/linkers";
import { WithKraphMediaUrl } from "@/lib/datalayer/kraphAccess";

interface Props {
  item: ListStructureKindFragment;

}

const TheCard = ({ item }: Props) => {
  return (
    <KraphStructureKind.Smart object={item}>
      <Card className="px-2 py-2 aspect-square transition-all ease-in-out duration-200 truncate relative">
        {item?.image && (
          <WithKraphMediaUrl media={item.image}>
            {(url) => (
              <Image
                src={url}
                style={{ filter: "brightness(0.2)" }}
                className="z-3 object-cover h-full w-full absolute top-0 left-0 rounded rounded-lg"
              />
            )}
          </WithKraphMediaUrl>
        )}
        <div className="p-3 h-full w-full absolute top-0 left-0 bg-opacity-20  hover:bg-opacity-10 transition-all ease-in-out duration-200 flex flex-col break-all flex-wrapp overflow-y-hidden">
          <KraphStructureKind.DetailLink
            className={({ isActive } /*  */) =>
              "z-10 font-bold text-md mb-2 cursor-pointer flex-wrap flex truncate" +
              (isActive ? "text-primary-300" : "")
            }
            object={item}
          >
            {item?.identifier}
          </KraphStructureKind.DetailLink>
          <p className="text-sm text-muted-foreground">{item?.description}</p>
        </div>
      </Card>
    </KraphStructureKind.Smart>
  );
};

export default React.memo(TheCard);