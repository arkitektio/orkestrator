import React from "react";
import { notEmpty } from "../../floating/utils";
import { useDeploymentsQuery } from "../api/graphql";

import { ListRender } from "../../layout/SectionTitle";
import { PortDeployment } from "../../linker";
import { useAppifyDeployment } from "../../mates/deployment/useAppifyDeployment";
import { useDeleteDeployment } from "../../mates/deployment/useDeleteDeployment";
import { withPort } from "../PortContext";
import { DeploymentCard } from "./cards/DeploymentCard";

export type IMyWhalesProps = {};

const MyDeployments: React.FC<IMyWhalesProps> = ({}) => {
  const { data, refetch } = withPort(useDeploymentsQuery)({
    variables: { limit: 20 },
  });

  const deployDeployment = useAppifyDeployment();
  const deleteDeployment = useDeleteDeployment();

  return (
    <ListRender
      title={
        <PortDeployment.ListLink>Potential Deployments</PortDeployment.ListLink>
      }
      array={data?.deployments?.filter(notEmpty)}
      refetch={refetch}
    >
      {(dep, index) => (
        <DeploymentCard
          deployment={dep}
          key={index}
          mates={[deployDeployment, deleteDeployment(dep)]}
        />
      )}
    </ListRender>
  );
};

export { MyDeployments };
