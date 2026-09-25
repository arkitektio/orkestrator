import { Card } from "@/components/ui/card";
import { LokServiceInstance } from "@/linkers";
import { ListServiceInstanceFragment } from "@/lok/api/graphql";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { memo } from "react";

export default memo(
  ({
    data,
    isConnectable,
  }: NodeProps<Node<ListServiceInstanceFragment>>) => {
    return (
      <>
        <Handle
          type="target"
          position={Position.Top}
          style={{
            left: "50%",
            top: "50%",
            zIndex: 0,
            color: "transparent",
            background: "transparent",
            stroke: "transparent",

            border: "0px solid transparent",
          }}
          onConnect={(params) => console.log("handle onConnect", params)}
          isConnectable={isConnectable}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            left: "50%",
            top: "50%",
            zIndex: 0,
            color: "transparent",
            background: "transparent",
            stroke: "transparent",

            border: "0px solid transparent",
          }}
          className="invisible"
          isConnectable={isConnectable}
        />
        <Card
          style={{ padding: 10, width: 100, height: 100 }}
          className="flex flex-col justify-center items-center p-3"
        >
          <LokServiceInstance.DetailLink object={data} className={"text-xl"}>
            {data.release.service.identifier}
          </LokServiceInstance.DetailLink>
        </Card>
      </>
    );
  },
);
