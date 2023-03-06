import React from "react";
import { BsTrash } from "react-icons/bs";
import Timestamp from "react-timestamp";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { notEmpty } from "../../floating/utils";
import { SectionTitle } from "../../layout/SectionTitle";
import { Container, Whale } from "../../linker";
import {
  ContainerStatus,
  useWhalesQuery,
  useRunWhaleMutation,
  useDeleteWhaleMutation,
  WhalesDocument,
  WhalesQuery,
  usePullWhaleMutation,
} from "../api/graphql";
import { withPort } from "../PortContext";
export type IMyGraphsProps = {};

const MyWhales: React.FC<IMyGraphsProps> = ({}) => {
  const { data, error, loading } = withPort(useWhalesQuery)({});

  const [deploy] = withPort(useRunWhaleMutation)();

  const [pull] = withPort(usePullWhaleMutation)();

  const [deleteWhale] = withPort(useDeleteWhaleMutation)({
    update(cache, result) {
      const existing = cache.readQuery<WhalesQuery>({
        query: WhalesDocument,
      });
      cache.writeQuery({
        query: WhalesDocument,
        data: {
          whales: existing?.whales?.filter(
            (t: any) => t.id !== result.data?.deleteWhale?.id
          ),
        },
      });
    },
  });

  const { confirm } = useConfirm();

  return (
    <div>
      <Whale.ListLink>
        <SectionTitle>My Whales</SectionTitle>
      </Whale.ListLink>
      <br />
      <ResponsiveContainerGrid>
        {data?.whales?.filter(notEmpty).map((whale, index) => (
          <Whale.Smart
            key={index}
            object={whale.id}
            className="max-w-sm rounded  shadow-md bg-slate-800 text-white group"
            additionalMates={(accept, self) => {
              if (!self) return [];

              if (accept == "item:@port/whale") {
                return [
                  {
                    accepts: [accept],
                    action: async (self, drops) => {
                      await confirm({
                        message: "Do you really want to delete?",
                        subtitle: "Deletion is irreversible!",
                        confirmLabel: "Yes delete!",
                      });

                      await deleteWhale({
                        variables: { id: self.object },
                      });
                    },
                    label: <BsTrash />,
                    description: "Delete Run",
                  },
                  {
                    action: async (self, drops) => {
                      await confirm({
                        message: "Do you really want to deploy this whale?",
                        confirmLabel: "Yes deploy!",
                      });

                      await deploy({ variables: { id: self.object } });
                    },
                    label: "Deploy",
                    description: "Deploy Whale",
                  },
                  {
                    action: async (self, drops) => {
                      await confirm({
                        message: "Do you really want to update this whale?",
                        confirmLabel: "Yes deploy!",
                      });

                      await pull({ variables: { id: self.object } });
                    },
                    label: "Pull",
                    description: "Pull Update",
                  },
                ];
              }

              if (accept == "list:@port/whale") {
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
                  {whale?.image}
                </span>
              </div>
              <Whale.DetailLink
                className="text-xl font-light cursor-pointer mb-1"
                object={whale?.id}
              >
                {whale?.image}
              </Whale.DetailLink>
            </div>
            <div className="pl-2 pb-2">
              Updated{" "}
              {whale.latestPull && (
                <Timestamp date={whale.latestPull} relative={true} />
              )}
            </div>
          </Whale.Smart>
        ))}
      </ResponsiveContainerGrid>
    </div>
  );
};

export { MyWhales };
