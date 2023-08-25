import { RekuestNode } from "../../../linker";
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
    <RekuestNode.Smart
      object={node?.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded shadow-xl group text-white bg-slate-900 p-3 hover:bg-slate-700 hover:border-slate-600 rounded rounded-md border-slate-700 border-1 border transition-all ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-1 ring-primary-200 "
        }`
      }
      mates={mates}
    >
      <RekuestNode.DetailLink className="cursor-pointer" object={node?.id}>
        <div className="text-xl font-medium mb-2">{node?.name}</div>
        <div className="text-sm mb-2">{node?.description}</div>
        <p className="text-xs font-light">{node?.interfaces?.join(", ")}</p>
      </RekuestNode.DetailLink>
    </RekuestNode.Smart>
  );
};
