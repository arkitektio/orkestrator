import React from "react";
import { Card } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import { ListProtocolEventCategoryFragment } from "@/kraph/api/graphql";
import { KraphProtocolEventCategory } from "@/linkers";
import { WithKraphMediaUrl } from "@/lib/datalayer/kraphAccess";

interface Props {
  item: ListProtocolEventCategoryFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <KraphProtocolEventCategory.Smart object={item}>
      <Card className="px-2 py-2  aspect-square transition-all ease-in-out duration-200 truncate relative">
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
        <div className="p-3 h-full w-full bg-opacity-20 hover:bg-opacity-10 transition-all ease-in-out duration-200 flex flex-col break-all overflow-y-hidden truncate">
          <KraphProtocolEventCategory.DetailLink
            className={({ isActive }) =>
              "z-10 font-bold text-md mb-2 cursor-pointer " +
              (isActive ? "text-primary-300" : "")
            }
            object={item}
          >
            {item?.label}
          </KraphProtocolEventCategory.DetailLink>
          <div className="text-sm flex-grow text-muted-foreground break-words">
            {item?.description}
          </div>
        </div>
      </Card>
    </KraphProtocolEventCategory.Smart>
  );
};

export default React.memo(TheCard);