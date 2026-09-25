import { Card } from "@/core/ui/card";
import { KraphRelationCategory } from "@/core/linkers";
import {
  BaseEdge,
  EdgeLabelRenderer,
  useInternalNode,
  type EdgeProps,
} from "@xyflow/react";
import { RelationEdge } from "../types";
import { getEdgeParams } from "../utils";

export type GetSpecialPathParams = {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
};

export const getSpecialPath = (
  { sourceX, sourceY, targetX, targetY }: GetSpecialPathParams,
  offset: number,
) => {
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2;

  return `M ${sourceX} ${sourceY} Q ${centerX} ${centerY + offset
    } ${targetX} ${targetY}`;
};

export default ({
  id: _id,
  data,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition: _sourcePosition,
  targetPosition: _targetPosition,
  markerEnd,
}: EdgeProps<RelationEdge>) => {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);

  let path = "";
  const offset = 0;
  let centerX = (sourceX + targetX) / 2;
  let centerY = (sourceY + targetY) / 2;

  if (source == target) {
    const radiusX = 100;
    const radiusY = 100;
    path = `M ${sourceX - 10} ${sourceY} A ${radiusX} ${radiusY} 0 1 0 ${targetX + 5
      } ${targetY}`;

    centerX = sourceX - radiusX * 2;
    centerY = (sourceY + targetY) / 2;
  } else {
    path = getSpecialPath(
      { sourceX: sx, sourceY: sy, targetX: tx, targetY: ty },
      offset,
    );
  }

  return (
    <>
      <BaseEdge path={path} markerEnd={markerEnd} label={data?.label} />
      <EdgeLabelRenderer>
        <Card
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${centerX}px,${centerY + offset}px)`,
          }}
          className="p-1 text-xs group nodrag nopan transition-opacity"
        >
          <KraphRelationCategory.Smart
            object={{ id: data?.id || "0" }}
            className="w-20"
          >
            {data?.id && (
              <KraphRelationCategory.DetailLink object={{ id: data.id }}>
                {data?.label}
              </KraphRelationCategory.DetailLink>
            )}
          </KraphRelationCategory.Smart>
        </Card>
      </EdgeLabelRenderer>
    </>
  );
};
