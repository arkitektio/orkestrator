import React from "react";
import { Card } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import { ListRelationCategoryFragment } from "@/kraph/api/graphql";
import { KraphRelationCategory } from "@/linkers";
import { WithKraphMediaUrl } from "@/lib/datalayer/kraphAccess";

interface Props {
  item: ListRelationCategoryFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <KraphRelationCategory.Smart object={item}>
      <Card className="px-2 py-2 aspect-square transition-all ease-in-out duration-200 truncate relative ">
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
        <div className="p-3 h-full w-full absolute top-0 left-0 bg-opacity-20  hover:bg-opacity-10 transition-all ease-in-out duration-200 flex flex-col break-all overflow-y-hidden">
          <KraphRelationCategory.DetailLink
            className={({ isActive } /*  */) =>
              "z-10 font-bold text-md mb-2 cursor-pointer " +
              (isActive ? "text-primary-300" : "")
            }
            object={item}
          >
            {item?.label}
          </KraphRelationCategory.DetailLink>
          <p className="text-sm text-muted-foreground">{item?.description}</p>
        </div>
      </Card>
    </KraphRelationCategory.Smart>
  );
};

export default React.memo(TheCard);