import React from "react";
import { Card } from "@/components/ui/card";
import { KraphGraph } from "@/linkers";
import { ListGraphFragment } from "../../api/graphql";

interface Props {
  item: ListGraphFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <KraphGraph.Smart object={item}>
      <Card className="px-2 py-2  aspect-square transition-all ease-in-out duration-200 truncate group">

        <div className="p-3 h-full w-full bg-opacity-20 hover:bg-opacity-10 transition-all ease-in-out duration-200 flex flex-col break-all overflow-y-hidden truncate">
          <KraphGraph.DetailLink
            className={({ isActive }) =>
              "z-10 font-bold text-md mb-2 cursor-pointer " +
              (isActive ? "text-primary-300" : "")
            }
            object={item}
          >
            {item?.name}
          </KraphGraph.DetailLink>
          <div className="z-10 text-sm flex-grow text-muted-foreground break-words flex-wrap flex">
            {item?.description}
          </div>
        </div>
      </Card>
    </KraphGraph.Smart>
  );
};

export default React.memo(TheCard);