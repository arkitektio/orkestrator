import React from "react";
import { SectionTitle } from "../layout/SectionTitle";
import { FlussFlow } from "../linker";
import { ProvisionStatus } from "../rekuest/api/graphql";
import { usePostman } from "../rekuest/providers/legacy/postman-context";

export type IGeneratorsProps = {};

const MyRunningFlows: React.FC<IGeneratorsProps> = ({}) => {
  const { provisions } = usePostman();

  const flowProvisions = provisions?.provisions?.filter(
    (res) =>
      res?.template?.extensions?.includes("graph") &&
      res?.status == ProvisionStatus.Active
  );

  return (
    <>
      <FlussFlow.ListLink>
        <SectionTitle>Running Flows</SectionTitle>
      </FlussFlow.ListLink>
      <div className="pt-2 pb-2 grid grid-flow-col grid-cols-6 grid-rows-1 gap-4">
        {flowProvisions?.map((prov, index) => (
          <div
            key={index}
            className="max-w-sm rounded overflow-hidden shadow-md bg-white"
          >
            <div className="p-2 ">
              <div className="text-xl font-light mb-2">{prov?.id}</div>
              <p className="text-gray-700 text-sm">
                {prov?.agent?.registry?.app?.identifier}
              </p>
            </div>
            <div className="pl-2 pt-2 pb-2"></div>
          </div>
        ))}
      </div>
    </>
  );
};

export { MyRunningFlows };
