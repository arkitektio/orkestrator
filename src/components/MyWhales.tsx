import React from "react";
import {
  BsCaretLeft,
  BsCaretRight,
  BsPlusCircle,
  BsTrash,
} from "react-icons/bs";
import { useNavigate } from "react-router";
import {
  useDeleteWhaleMutation,
  useWhalesQuery,
  WhalesDocument,
} from "../port/api/graphql";
import { withPort } from "../port/port";
import { useConfirm } from "./confirmer/confirmer-context";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";

export type IMyWhalesProps = {};

const MyWhales: React.FC<IMyWhalesProps> = ({}) => {
  const { data } = withPort(useWhalesQuery)();
  const [deleteWhale] = withPort(useDeleteWhaleMutation)({
    update(cache, result) {
      const existing: any = cache.readQuery({
        query: WhalesDocument,
      });
      cache.writeQuery({
        query: WhalesDocument,
        data: {
          whales: existing.whales.filter(
            (t: any) => t.id !== result.data?.deleteWhale?.id
          ),
        },
      });
    },
  });

  const { confirm } = useConfirm();

  return (
    <div>
      <span className="font-light text-xl">My Whales</span>
      <br />
      <ResponsiveGrid>
        {data?.whales?.map((whale, index) => (
          <div
            key={index}
            className="max-w-sm rounded overflow-hidden shadow-md bg-white group"
          >
            <div className="p-2 ">
              <div className="flex">
                <span className="flex-grow font-semibold text-xs">
                  {whale?.image}
                </span>
                <span
                  className="flex-none mt-1 text-white cursor-pointer group-hover:text-red-400"
                  onClick={() => {
                    if (whale?.id) {
                      confirm({
                        message: "Do you really want to delete this Whale?",
                        subtitle: "Deletion is irreversible!",
                        confirmLabel: "Yes delete!",
                      })
                        .then(() => {
                          deleteWhale({
                            variables: { id: whale?.id },
                          });
                        })
                        .catch(console.log);
                    }
                  }}
                >
                  <BsTrash />
                </span>
              </div>
            </div>
          </div>
        ))}
      </ResponsiveGrid>
    </div>
  );
};

export { MyWhales };
