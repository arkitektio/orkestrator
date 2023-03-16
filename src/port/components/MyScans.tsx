import React, { useState } from "react";
import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { notEmpty } from "../../floating/utils";
import { RepoScan } from "../../linker";
import { useRepoScansQuery } from "../api/graphql";

import { useDialog } from "../../layout/dialog/DialogProvider";
import { withPort } from "../PortContext";
import { PrepareScanDialog } from "./dialogs/PrepareScanDialog";
import { RepoScanCard } from "./cards/RepoScanCard";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { useDeployScanMate } from "../../mates/scan/useDeployScanMate";
import { useDeleteScan } from "../../mates/scan/useDeleteScanMate";

export type IMyWhalesProps = {};

const MyRepoScans: React.FC<IMyWhalesProps> = ({}) => {
  const { data } = withPort(useRepoScansQuery)();

  const deployScan = useDeployScanMate();
  const deleteRepoScan = useDeleteScan();

  return (
    <div>
      <span className="font-light text-xl text-white">My Scans</span>
      <br />
      <ResponsiveContainerGrid>
        {data?.reposcans?.filter(notEmpty).map((s, index) => (
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
