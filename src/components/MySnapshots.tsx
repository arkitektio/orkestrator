import React from "react";
import {
  BsCaretLeft,
  BsCaretRight,
  BsPlusCircle,
  BsTrash,
} from "react-icons/bs";
import { useNavigate } from "react-router";
import { notEmpty } from "../floating/utils";
import {
  SnapshotsDocument,
  SnapshotsQuery,
  useDeleteSnapshotMutation,
  useSnapshotsQuery,
} from "../fluss/api/graphql";
import { withFluss } from "../fluss/fluss";
import { SectionTitle } from "../layout/SectionTitle";
import { Snapshot } from "../linker";
import { useConfirm } from "./confirmer/confirmer-context";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";

export type IMyGraphsProps = {};

const MySnapshots: React.FC<IMyGraphsProps> = ({}) => {
  const { data } = withFluss(useSnapshotsQuery)();
  const [deleteGraph] = withFluss(useDeleteSnapshotMutation)({
    update(cache, result) {
      const existing = cache.readQuery<SnapshotsQuery>({
        query: SnapshotsDocument,
      });
      cache.writeQuery<SnapshotsQuery>({
        query: SnapshotsDocument,
        data: {
          snapshots: existing?.snapshots?.filter(
            (t: any) => t.id !== result.data?.deleteSnapshot?.id
          ),
        },
      });
    },
  });

  const { confirm } = useConfirm();

  return (
    <div>
      <SectionTitle>My Snapshots</SectionTitle>
      <br />
      <ResponsiveGrid>
        {data?.snapshots?.filter(notEmpty).map((s, index) => (
          <div
            key={index}
            className="max-w-sm rounded overflow-hidden shadow-md bg-white group"
          >
            <div className="p-2 ">
              <div className="flex">
                <span className="flex-grow font-semibold text-xs">
                  {s?.run?.id}
                </span>
                <span
                  className="flex-none mt-1 text-white cursor-pointer group-hover:text-red-400"
                  onClick={() => {
                    if (s?.id) {
                      confirm({
                        message: "Do you really want to delete this Graph?",
                        subtitle: "Deletion is irreversible!",
                        confirmLabel: "Yes delete!",
                      })
                        .then(() => {
                          deleteGraph({
                            variables: { id: s?.id },
                          });
                        })
                        .catch(console.log);
                    }
                  }}
                >
                  <BsTrash />
                </span>
              </div>
              <Snapshot.DetailLink
                className="text-xl font-light cursor-pointer mb-1"
                object={s.id}
              >
                Open
              </Snapshot.DetailLink>
            </div>
            <div className="pl-2 pb-2"></div>
          </div>
        ))}
      </ResponsiveGrid>
    </div>
  );
};

export { MySnapshots };
