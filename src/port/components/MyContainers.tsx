import React from "react";
import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { notEmpty } from "../../floating/utils";
import { SectionTitle } from "../../layout/SectionTitle";
import { Container, Whale } from "../../linker";
import {
  ContainerStatus,
  useContainersQuery,
  useStopContainerMutation,
  useRestartContainerMutation,
  useRemoveContainerMutation,
} from "../api/graphql";
import { withPort } from "../PortContext";
export type IMyGraphsProps = {};

const MyContainers: React.FC<IMyGraphsProps> = ({}) => {
  const { data, error, loading } = withPort(useContainersQuery)({
    variables: { status: [ContainerStatus.Exited, ContainerStatus.Running] },
    pollInterval: 1000,
  });

  const { confirm } = useConfirm();

  const [restart] = withPort(useRestartContainerMutation)();
  const [stop] = withPort(useStopContainerMutation)();
  const [remove] = withPort(useRemoveContainerMutation)();

  return (
    <div>
      <Whale.ListLink>
        <SectionTitle>My Contained Apps</SectionTitle>
      </Whale.ListLink>
      <br />
      {JSON.stringify(error)}
      <ResponsiveGrid>
        {data?.containers?.filter(notEmpty).map((s, index) => (
          <Container.Smart
            key={index}
            object={s.id}
            className="max-w-sm rounded  shadow-md bg-slate-800 text-white group"
            additionalMates={(accept, self) => {
              if (!self) return [];

              if (accept == "item:@port/container") {
                return [
                  {
                    action: async (self, drops) => {
                      await confirm({
                        message: "Do you really want to delete?",
                        subtitle: "Deletion is irreversible!",
                        confirmLabel: "Yes delete!",
                      });

                      await remove({ variables: { id: self.object } });
                    },
                    label: <BsTrash />,
                    description: "Delete Run",
                  },
                  {
                    action: async (self, drops) => {
                      await confirm({
                        message: "Do you really want to restart?",
                        subtitle: "Restarting will take some seconds!",
                        confirmLabel: "Yes restart!",
                      });

                      await restart({ variables: { id: self.object } });
                    },
                    label: "Restart",
                    description: "Delete Run",
                  },
                  {
                    action: async (self, drops) => {
                      await confirm({
                        message: "Do you really want to stop?",
                        subtitle: "Deletion is irreversible!",
                        confirmLabel: "Yes delete!",
                      });

                      await stop({ variables: { id: self.object } });
                    },
                    label: "Stop",
                    description: "Delete Run",
                  },
                ];
              }

              if (accept == "list:@port/container") {
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
                  {s.status}
                </span>
              </div>
              <Container.DetailLink
                className="text-xl font-light cursor-pointer mb-1"
                object={s?.id}
              >
                {s?.whale?.image || "No Flow"}
              </Container.DetailLink>
            </div>
            <div className="pl-2 pb-2"></div>
          </Container.Smart>
        ))}
      </ResponsiveGrid>
    </div>
  );
};

export { MyContainers };
