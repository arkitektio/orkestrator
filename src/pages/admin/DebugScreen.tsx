import React from "react";
import {
  useResetAgentsMutation,
  useResetAssignationsMutation,
  useResetNodesMutation,
  useResetProvisionsMutation,
  useResetReservationsMutation,
} from "../../arkitekt/api/graphql";
import { withArkitekt } from "../../arkitekt/arkitekt";
export type IApplicationsProps = {};

const DebugScreen: React.FC<IApplicationsProps> = ({}) => {
  const [resetAg] = withArkitekt(useResetAgentsMutation)();
  const [resetA] = withArkitekt(useResetAssignationsMutation)();
  const [resetP] = withArkitekt(useResetProvisionsMutation)();
  const [resetR] = withArkitekt(useResetReservationsMutation)();
  const [resetN] = withArkitekt(useResetNodesMutation)();

  return (
    <div className={"grid grid-cols-12 gap-5 h-screen"}>
      <div className={"col-span-1 pl-2 pr-2"}>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => resetAg()}
        >
          Reset Agents{" "}
        </button>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => resetP()}
        >
          Reset Provisions{" "}
        </button>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => resetA()}
        >
          Reset Assigantions{" "}
        </button>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => resetR()}
        >
          Reset Reservation{" "}
        </button>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => resetN()}
        >
          Reset Nodes{" "}
        </button>
      </div>
    </div>
  );
};

export { DebugScreen };
