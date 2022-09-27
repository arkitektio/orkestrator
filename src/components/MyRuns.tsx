import React from "react";
import {
  BsCaretLeft,
  BsCaretRight,
  BsPlusCircle,
  BsTrash,
} from "react-icons/bs";
import { useNavigate } from "react-router";
import Timestamp from "react-timestamp";
import { notEmpty } from "../floating/utils";
import {
  RunsDocument,
  RunsQuery,
  useDeleteRunMutation,
  useRunsQuery,
} from "../fluss/api/graphql";
import { withFluss } from "../fluss/fluss";
import { SectionTitle } from "../layout/SectionTitle";
import { Run } from "../linker";
import { useConfirm } from "./confirmer/confirmer-context";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";
export type IMyGraphsProps = {};

const MyRuns: React.FC<IMyGraphsProps> = ({}) => {
  const { data } = withFluss(useRunsQuery)();
  const [deleteRun] = withFluss(useDeleteRunMutation)({
    update(cache, result) {
      const existing = cache.readQuery<RunsQuery>({
        query: RunsDocument,
      });
      cache.writeQuery<RunsQuery>({
        query: RunsDocument,
        data: {
          runs: existing?.runs?.filter(
            (t: any) => t.id !== result.data?.deleteRun?.id
          ),
        },
      });
    },
  });

  const { confirm } = useConfirm();

  return (
    <div>
      <Run.ListLink>
        <SectionTitle>Latest Runs</SectionTitle>
      </Run.ListLink>
      <br />
      <ResponsiveGrid>
        {data?.runs?.filter(notEmpty).map((s, index) => (
          <Run.Smart
            key={index}
            object={s.id}
            className="max-w-sm rounded  shadow-md bg-slate-800 text-white group"
            additionalMates={(accept, self) => {
              if (!self) return [];

              if (accept == "item:@fluss/run") {
                return [
                  {
                    accepts: [accept],
                    action: async (self, drops) => {
                      await confirm({
                        message: "Do you really want to delete?",
                        subtitle: "Deletion is irreversible!",
                        confirmLabel: "Yes delete!",
                      });

                      await deleteRun({
                        variables: { id: self.object },
                      });
                    },
                    label: <BsTrash />,
                    description: "Delete Run",
                  },
                ];
              }

              if (accept == "list:@fluss/run") {
                return [
                  {
                    accepts: [accept],
                    action: async (self, drops) => {
                      await confirm({
                        message: "Do you really want all this samples delete?",
                        subtitle: "Deletion is irreversible!",
                        confirmLabel: "Yes delete!",
                      });

                      for (const drop of drops) {
                        await deleteRun({
                          variables: { id: drop.object },
                        });
                      }
                    },
                    label: (
                      <div className="flex flex-row">
                        <BsTrash className="my-auto" />{" "}
                        <span className="my-auto">Delete all</span>
                      </div>
                    ),
                    description: "Delete All Runs",
                  },
                ];
              }

              return [];
            }}
          >
            <div className="p-2 ">
              <div className="flex">
                <span className="flex-grow font-semibold text-xs">
                  <Timestamp date={s.createdAt} relative />
                </span>
              </div>
              <Run.DetailLink
                className="text-xl font-light cursor-pointer mb-1"
                object={s?.id}
              >
                {s?.flow?.diagram?.name || "No Flow"}
              </Run.DetailLink>
            </div>
            <div className="pl-2 pb-2"></div>
          </Run.Smart>
        ))}
      </ResponsiveGrid>
    </div>
  );
};

export { MyRuns };
