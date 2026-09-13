import { Image } from "@/components/ui/image";
import { KraphReagentCategory } from "@/linkers";
import { NodeProps, NodeResizer } from "@xyflow/react";
import { memo } from "react";
import { Handles } from "../components/Handles";
import { ReagentNode } from "../types";
import { WithKraphMediaUrl } from "@/lib/datalayer/kraphAccess";

export const ReagentCategoryNode = memo(({ data, id, selected }: NodeProps<ReagentNode>) => {
  return (
    <>
      <NodeResizer
        color="#ff0071"
        isVisible={selected}
        minWidth={100}
        minHeight={30}
      />
      <Handles self={id} />
      <KraphReagentCategory.Smart
        object={{ id: data.id }}
        containerClassName="h-full w-full rounded-full ring group data-[selected=true]:ring-4 data-[selected=true]:ring-primary data-[selected=true]:ring-4 data-[bselected=true]:ring-red-400  bg-black"
        className="h-full w-full overflow-hidden rounded-full"
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
        <div className="absolute top-0 left-0 right-0 bottom-0 z-10 flex items-center justify-center flex-col gap-2 bg-black/50 truncate ">
          <KraphReagentCategory.DetailLink object={{ id: data.id }}>
            {data.label}
          </KraphReagentCategory.DetailLink>

        </div>
      </KraphReagentCategory.Smart>
    </>
  );
});


export default ReagentCategoryNode;
