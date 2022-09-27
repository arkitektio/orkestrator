import React from "react";
import { ResponsiveGrid } from "../../../components/layout/ResponsiveGrid";
import { useStructuresQuery } from "../../api/graphql";
import { withArkitekt } from "../../arkitekt";

export type IModelsProps = {};

const Models: React.FC<IModelsProps> = ({}) => {
  const { data } = withArkitekt(useStructuresQuery)();

  return (
    <>
      <div className="font-light text-xl">Registered Models </div>
      <ResponsiveGrid>
        {data?.structures?.map((structure) => (
          <div>
            <div className="font-light text-xl">{structure?.identifier} </div>
            <div className="grid grid-cols-3 mt-2"></div>
          </div>
        ))}
      </ResponsiveGrid>
    </>
  );
};

export { Models };
