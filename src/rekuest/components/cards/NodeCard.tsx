import { Node } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { NodeListItemFragment } from "../../api/graphql";

export const NodeCard = ({
  node,
  mates,
}: {
  node: NodeListItemFragment;
  mates: MateFinder[];
}) => {
  return (
    <Node.Smart
      object={node?.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded shadow-xl group text-white bg-slate-700 p-3 ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-1 ring-primary-200 "
        }`
      }
      mates={mates}
    >
      <Node.DetailLink className="cursor-pointer" object={node?.id}>
        <div className="text-xl font-light mb-2">{node?.name}</div>
        <div className="text-sm mb-2">{node?.description}</div>
        <p className="text-sm">{node?.interfaces?.join(", ")}</p>
      </Node.DetailLink>
    </Node.Smart>
  );
};
