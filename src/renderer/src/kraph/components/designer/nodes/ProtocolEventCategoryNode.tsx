import { Image } from "@/components/ui/image";
import { KraphProtocolEventCategory } from "@/linkers";
import { NodeProps, NodeResizer } from "@xyflow/react";
import { memo } from "react";
import { Handles } from "../components/Handles";
import { ProtocolEventNode } from "../types";
import { WithKraphMediaUrl } from "@/lib/datalayer/kraphAccess";

export const ProtocolEventCategoryNode = memo(({ data, id, selected }: NodeProps<ProtocolEventNode>) => {
  return (
    <>
      <NodeResizer
        color="#ff0071"
        isVisible={selected}
        minWidth={100}
        minHeight={30}
      />
      <Handles self={id} />
      <KraphProtocolEventCategory.Smart
        object={data}
        containerClassName="h-full w-full rounded-lg  group ring-4 ring-red ring-red-200"
        className="h-full w-full"
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
        <div className="absolute top-0 left-0 right-0 bottom-0 z-10 flex items-center justify-center flex-col bg-black/50 p-3 flex-row">
          <div className="w-full overflow-hidden">
            <KraphProtocolEventCategory.DetailLink
              object={data}
              className="font-bold align-middle text-center block text-1 transition-[font-size]"
            >
              {data.label}
            </KraphProtocolEventCategory.DetailLink>
          </div>

        </div>
      </KraphProtocolEventCategory.Smart>
    </>
  );
});

export default ProtocolEventCategoryNode;
