import { Card } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import {
  KraphProtocolEventCategory
} from "@/linkers";
import { NodeProps, NodeResizer } from "@xyflow/react";
import { memo } from "react";
import { Handles } from "../components/Handles";
import { PathMarker } from "../components/PathMarker";
import { NaturalEventNode } from "../types";
import { WithKraphMediaUrl } from "@/lib/datalayer/kraphAccess";

export const NaturalEventCategoryNode = memo(({ data, id, selected }: NodeProps<NaturalEventNode>) => {
  return (
    <>
      <NodeResizer
        color="#ff0071"
        isVisible={selected}
        minWidth={100}
        minHeight={30}
      />
      <Handles self={id} />
      <div className="absolute top-1 left-1 right-1 bottom-1 z-10">
        <Card
          className="h-full w-full rounded-lg z-10  relative overflow-hidden group ring-4 ring-green ring-green-200"
          style={{ zIndex: 10 }}
        >
          {/* If handles are conditionally rendered and not present initially, you need to update the node internals https://reactflow.dev/docs/api/hooks/use-update-node-internals/ */}
          {/* In this case we don't need to use useUpdateNodeInternals, since !isConnecting is true at the beginning and all handles are rendered initially. */}

          {data.image && (
            <WithKraphMediaUrl media={data.image}>
              {(url) => (
                <Image
                  src={url}
                  style={{ filter: "brightness(0.7)" }}
                  className="object-cover h-full w-full rounded rounded-lg"
                />
              )}
            </WithKraphMediaUrl>
          )}
          <div className="absolute top-0 left-0 right-0 bottom-0 z-10 flex items-center justify-center flex-col bg-black/50  ">
            <KraphProtocolEventCategory.DetailLink
              object={data}
              className={"font-bold"}
            >
              {data.label}
            </KraphProtocolEventCategory.DetailLink>

          </div>
          <PathMarker nodeId={id} />
        </Card>
      </div>
    </>
  );
});

export default NaturalEventCategoryNode;
