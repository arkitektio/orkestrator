import React from "react";
import { Workspace } from "../../../linker";
import { ListWorkspaceFragment } from "../../api/graphql";
import { useFluss } from "../../fluss-context";

interface WorkspaceCardProps {
  workspace: ListWorkspaceFragment;
}

export const WorkspaceCard = ({ workspace }: WorkspaceCardProps) => {
  const { s3resolve } = useFluss();

  return (
    <Workspace.Smart
      showSelfMates={true}
      placement="right"
      object={workspace.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded shadow-xl group text-white bg-slate-700 ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-1 ring-primary-200 "
        }`
      }
    >
      <div className="px-6 py-4">
        <Workspace.DetailLink
          className={({ isActive }) =>
            "font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={workspace.id}
        >
          <span className="truncate">{workspace?.name}</span>
        </Workspace.DetailLink>
        <p className="text-white-700 text-base"></p>
      </div>
    </Workspace.Smart>
  );
};
