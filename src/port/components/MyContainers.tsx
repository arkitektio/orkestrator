import React, { useEffect } from "react";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../floating/utils";
import { SectionTitle } from "../../layout/SectionTitle";
import { PortWhale } from "../../linker";
import { useContainerLifecycleMate } from "../../mates/container/useContainerLifecycleMate";
import { useSettings } from "../../settings/settings-context";
import { withPort } from "../PortContext";
import { ContainerStatus, useContainersQuery } from "../api/graphql";
import { ContainerCard } from "./cards/ContainerCard";
export type IMyGraphsProps = {};

const MyContainers: React.FC<IMyGraphsProps> = ({}) => {
  const { settings } = useSettings();
  const { data, error, loading, refetch, startPolling, stopPolling } = withPort(
    useContainersQuery
  )({
    variables: {
      status: [
        ContainerStatus.Exited,
        ContainerStatus.Running,
        ContainerStatus.Dead,
        ContainerStatus.Created,
        ContainerStatus.Paused,
        ContainerStatus.Restarting,
      ],
    },
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    // versionRefetch()

    startPolling(settings.pollInterval);
    return () => {
      stopPolling();
    };
  }, [stopPolling, startPolling]);

  const cLF = useContainerLifecycleMate();

  return (
    <div>
      <PortWhale.ListLink>
        <SectionTitle>My Contained Apps</SectionTitle>
      </PortWhale.ListLink>
      <button onClick={() => refetch()}>Hallo</button>
      <br />
      {JSON.stringify(error)}
      <ResponsiveContainerGrid>
        {data?.containers?.filter(notEmpty).map((s, index) => (
          <ContainerCard container={s} key={index} mates={[cLF(s)]} />
        ))}
      </ResponsiveContainerGrid>
    </div>
  );
};

export { MyContainers };
