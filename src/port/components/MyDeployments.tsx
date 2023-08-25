import React from "react";
import { notEmpty } from "../../floating/utils";
import { useDeploymentsQuery } from "../api/graphql";

import { ListRender } from "../../layout/SectionTitle";
import { PortDeployment } from "../../linker";
import { useDeleteScan } from "../../mates/scan/useDeleteScanMate";
import { useDeployScanMate } from "../../mates/scan/useDeployScanMate";
import { withPort } from "../PortContext";
import { RepoScanCard } from "./cards/DeploymentCard";

export type IMyWhalesProps = {};

const MyDeployments: React.FC<IMyWhalesProps> = ({}) => {
  const { data, refetch } = withPort(useDeploymentsQuery)({
    variables: { limit: 20 },
  });

  const deployScan = useDeployScanMate();
  const deleteRepoScan = useDeleteScan();

  return (
    <ListRender
      title={
        <PortDeployment.ListLink>Potential Deployments</PortDeployment.ListLink>
      }
      array={data?.deployments?.filter(notEmpty)}
      refetch={refetch}
    >
      {(scan, index) => (
        <RepoScanCard
          scan={scan}
          key={index}
          mates={[deployScan, deleteRepoScan(scan)]}
        />
      )}
    </ListRender>
  );
};

export { MyDeployments };
