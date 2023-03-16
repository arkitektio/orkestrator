import React from "react";
import { BsTrash } from "react-icons/bs";
import Timestamp from "react-timestamp";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { notEmpty } from "../../floating/utils";
import { SectionTitle } from "../../layout/SectionTitle";
import { Container, Whale } from "../../linker";
import { useDeleteWhaleMate } from "../../mates/whale/useDeleteWhaleMate";
import { useWhaleLifecycleMate } from "../../mates/whale/useWhaleLifecycleMate";
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

  const deleteWhaleMate = useDeleteWhaleMate();
  const whaleLifecyleMate = useWhaleLifecycleMate();

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
            mates={[deleteWhaleMate(whale), whaleLifecyleMate]}
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
