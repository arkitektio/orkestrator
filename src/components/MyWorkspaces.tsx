import React from "react";
import {
  MyWorkspacesDocument,
  MyWorkspacesQuery,
  useDeleteWorkspaceMutation,
  useMyWorkspacesQuery,
} from "../fluss/api/graphql";
import { withFluss } from "../fluss/fluss";
import { useFluss } from "../fluss/fluss-context";
import { SectionTitle } from "../layout/SectionTitle";
import { Workspace } from "../linker";
import { useConfirm } from "./confirmer/confirmer-context";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";
import { BsTrash } from "react-icons/bs";
export type IMyGraphsProps = {};

const DiagramCard: React.FC<{
  diagram: Exclude<MyWorkspacesQuery["myworkspaces"], null | undefined>[number];
}> = ({ diagram }) => {
  const { s3resolve } = useFluss();

  const { confirm } = useConfirm();

  const [deleteGraph] = withFluss(useDeleteWorkspaceMutation)({
    update(cache, result) {
      const existing: any = cache.readQuery({
        query: MyWorkspacesDocument,
      });
      cache.writeQuery({
        query: MyWorkspacesDocument,
        data: {
          myworkspaces: existing.myworkspaces.filter(
            (t: any) => t.id !== result.data?.deleteWorkspace?.id
          ),
        },
      });
    },
  });

  if (!diagram?.id) {
    return <>NO ID FAILURE</>;
  }

  return (
    <Workspace.Smart
      object={diagram?.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded shadow-xl group text-white bg-center bg-cover ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-1 ring-secondary-500 "
        }`
      }
      dragStyle={({ isDragging }) =>
        diagram?.latestFlow?.screenshot && !isDragging
          ? {
              backgroundImage: `url(${
                s3resolve && s3resolve(diagram.latestFlow?.screenshot)
              }), linear-gradient(rgba(0,0,0,0.3), rgba(1,1,1,0.5))`,
              backgroundRepeat: "no-repeat",
              backgroundBlendMode: "multiply",
            }
          : {
              background: "black",
            }
      }
      additionalMates={(accept, self) => {
        if (!self) return [];

        if (accept == "item:@fluss/workspace") {
          return [
            {
              label: "Delete Workspace",
              action: async (self, drops) => {
                let t = await confirm({
                  message: "Do you really want to delete this Workspace?",
                  subtitle: "Deletion is irreversible!",
                  confirmLabel: "Yes delete!",
                });

                await deleteGraph({
                  variables: {
                    id: drops[0].object,
                  },
                });
              },
            },
          ];
        }

        return [];
      }}
    >
      <div className="px-6 py-4">
        <div className="flex">
          <span className="flex-grow cursor-pointer font-semibold text-xs">
            {diagram?.name || "No Sample"}
          </span>
        </div>
        <Workspace.DetailLink
          className="font-bold text-xl mb-2 cursor-pointer"
          object={diagram?.id}
        >
          {diagram?.name}
        </Workspace.DetailLink>
      </div>
    </Workspace.Smart>
  );
};

const MyWorkspaces: React.FC<IMyGraphsProps> = ({}) => {
  const { data } = withFluss(useMyWorkspacesQuery)();

  return (
    <div>
      <SectionTitle>My Workspaces</SectionTitle>
      <br />
      <ResponsiveGrid>
        {data?.myworkspaces?.map((diagram, index) => (
          <DiagramCard key={index} diagram={diagram} />
        ))}
      </ResponsiveGrid>
    </div>
  );
};

export { MyWorkspaces as MyDiagrams };
