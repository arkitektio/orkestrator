import { Card } from "@/components/ui/card";
import { ListServiceInstanceMappingFragment } from "@/lok/api/graphql";
import {
  BaseEdge,
  Edge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from "@xyflow/react";

export default (
  props: EdgeProps<Edge<ListServiceInstanceMappingFragment>>,
) => {
  const {
    id,
    sourcePosition,
    targetPosition,
    sourceX,
    sourceY,
    targetX,
    targetY,
    style,
    markerEnd,
    data,
  } = props;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourcePosition,
    targetPosition,
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <>
      <BaseEdge
        id={id}
        style={{
          ...style,
          strokeWidth: 1,
        }}
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={20}
      />
      <EdgeLabelRenderer>
        <Card
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          className="p-1 text-xs group"
        >
          {data?.key}
        </Card>
      </EdgeLabelRenderer>
    </>
  );
};
