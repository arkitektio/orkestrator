import { FlussWorkspace } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListWorkspaceFragment } from "../../api/graphql";

interface WorkspaceCardProps {
  workspace: ListWorkspaceFragment;
  mates: MateFinder[];
}

export const WorkspaceCard = ({ workspace, mates }: WorkspaceCardProps) => {
  return (
    <FlussWorkspace.Smart
      showSelfMates={true}
      object={workspace.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `truncate rounded shadow-xl group text-white bg-slate-700 ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-1 ring-primary-200 "
        }`
      }
      mates={mates}
    >
      <div className="px-6 py-4">
        <FlussWorkspace.DetailLink
          className={({ isActive }) =>
            "font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={workspace.id}
        >
          <span className="truncate">{workspace?.name}</span>
        </FlussWorkspace.DetailLink>
        <p className="text-white-700 text-base"></p>
      </div>
    </FlussWorkspace.Smart>
  );
};
