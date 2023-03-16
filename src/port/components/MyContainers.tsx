import React from "react";
import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { notEmpty } from "../../floating/utils";
import { SectionTitle } from "../../layout/SectionTitle";
import { Container, Whale } from "../../linker";
import { useContainerLifecycleMate } from "../../mates/container/useContainerLifecycleMate";
import {
  ContainerStatus,
  useContainersQuery,
  useStopContainerMutation,
  useRestartContainerMutation,
  useRemoveContainerMutation,
} from "../api/graphql";
import { withPort } from "../PortContext";
import { ContainerCard } from "./cards/ContainerCard";
export type IMyGraphsProps = {};

const MyContainers: React.FC<IMyGraphsProps> = ({}) => {
  const { data, error, loading } = withPort(useContainersQuery)({
    variables: { status: [ContainerStatus.Exited, ContainerStatus.Running] },
    pollInterval: 1000,
  });

  const cLF = useContainerLifecycleMate();

  return (
    <div>
      <Whale.ListLink>
        <SectionTitle>My Contained Apps</SectionTitle>
      </Whale.ListLink>
      <br />
      {JSON.stringify(error)}
      <ResponsiveContainerGrid>
        {data?.containers?.filter(notEmpty).map((s, index) => (
          <ContainerCard container={s} key={index} mates={[cLF]} />
        ))}
      </ResponsiveContainerGrid>
    </div>
  );
};

export { MyContainers };
