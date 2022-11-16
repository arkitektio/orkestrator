import React, { useState, useEffect } from "react";
import {
  DetailProvisionFragment,
  DetailReservationFragment,
} from "../../rekuest/api/graphql";
import { MonitorRiver } from "../../floating/monitor/MonitorRiver";
import { ShowRiver } from "../../floating/show/ShowRiver";
import { useFlowQuery } from "../api/graphql";
import { withFluss } from "../fluss";

export interface FlussProvisionProps {
  provision: DetailProvisionFragment;
}

export const FlussProvision: React.FC<FlussProvisionProps> = ({
  provision,
}) => {
  if (!provision.template?.params.flow)
    return (
      <div className="text-red-300">
        Faulty provision! Expected Node to have metadata
      </div>
    );

  let { data, refetch } = withFluss(useFlowQuery)({
    variables: { id: provision.template?.params.flow },
    nextFetchPolicy: "network-only",
  });

  return (
    <>
      {data?.flow && (
        <MonitorRiver
          flow={data?.flow}
          reserveState={{ reservations: provision.causedReservations }}
        />
      )}
    </>
  );
};
