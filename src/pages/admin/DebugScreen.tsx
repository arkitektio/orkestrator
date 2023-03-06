import React from "react";
import { SectionTitle } from "../../layout/SectionTitle";
import { useRekuest, withRekuest } from "../../rekuest";
import {
  usePurgeNodesMutation,
  useResetAgentsMutation,
  useResetAssignationsMutation,
  useResetNodesMutation,
  useResetProvisionsMutation,
  useResetReservationsMutation,
} from "../../rekuest/api/graphql";
export type IApplicationsProps = {};

const DebugScreen: React.FC<IApplicationsProps> = ({}) => {
  const [resetAg] = withRekuest(useResetAgentsMutation)();
  const [resetA] = withRekuest(useResetAssignationsMutation)();
  const [resetP] = withRekuest(useResetProvisionsMutation)();
  const [resetR] = withRekuest(useResetReservationsMutation)();
  const [resetN] = withRekuest(useResetNodesMutation)();
  const [purgeNodes] = withRekuest(usePurgeNodesMutation)();

  const { configure } = useRekuest();

  const disableRekuest = () => {
    configure(undefined);
  };

  return (
    <>
      <SectionTitle>Debug Options</SectionTitle>
      <div className={"flex flex-row gap-1 mt-1"}>
        <button
          type="button"
          className="bg-primary-500 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => resetAg()}
        >
          Reset Agents{" "}
        </button>
        <button
          type="button"
          className="bg-primary-500 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => resetP()}
        >
          Reset Provisions{" "}
        </button>
        <button
          type="button"
          className="bg-primary-500 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => resetA()}
        >
          Reset Assigantions{" "}
        </button>
        <button
          type="button"
          className="bg-primary-500 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => resetR()}
        >
          Reset Reservation{" "}
        </button>
        <button
          type="button"
          className="bg-primary-500 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => resetN()}
        >
          Reset Nodes{" "}
        </button>
        <button
          type="button"
          className="bg-primary-500 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => disableRekuest()}
        ></button>
        <button
          type="button"
          className="bg-primary-500 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => purgeNodes()}
        >
          Purges Nodes with no Template{" "}
        </button>
      </div>
    </>
  );
};

export { DebugScreen };
