import React from "react";
import { notEmpty } from "../../floating/utils";
import { useDeploymentsQuery } from "../api/graphql";

import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { useDeleteScan } from "../../mates/scan/useDeleteScanMate";
import { useDeployScanMate } from "../../mates/scan/useDeployScanMate";
import { withPort } from "../PortContext";
import { RepoScanCard } from "./cards/RepoScanCard";

export type IMyWhalesProps = {};

const MyRepoScans: React.FC<IMyWhalesProps> = ({}) => {
  const { data } = withPort(useDeploymentsQuery)();

  const deployScan = useDeployScanMate();
  const deleteRepoScan = useDeleteScan();

  return (
    <div>
      <span className="font-light text-xl text-white">My Scans</span>
      <br />
      <ResponsiveContainerGrid>
        {data?.deployments?.filter(notEmpty).map((s, index) => (
          <RepoScanCard
            scan={s}
            key={index}
            mates={[deployScan, deleteRepoScan(s)]}
          />
        ))}
      </ResponsiveContainerGrid>
    </div>
  );
};

export { MyRepoScans };
