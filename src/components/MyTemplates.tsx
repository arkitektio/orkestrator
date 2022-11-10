import React from "react";
import { notEmpty } from "../floating/utils";
import { SectionTitle } from "../layout/SectionTitle";
import { Template } from "../linker";
import { withRekuest } from "../rekuest";
import { useTemplatesQuery } from "../rekuest/api/graphql";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";

export type IMyNodesProps = {};

const MyTemplates: React.FC<IMyNodesProps> = ({}) => {
  const { data, loading, subscribeToMore } = withRekuest(useTemplatesQuery)({
    pollInterval: 30000,
  });

  return (
    <div>
      <Template.ListLink>
        <SectionTitle>My Templates</SectionTitle>
      </Template.ListLink>
      <br />
      <ResponsiveGrid>
        {data?.templates?.filter(notEmpty).map((temp, index) => (
          <div
            key={index}
            className="max-w-sm rounded overflow-hidden shadow-md dark:bg-slate-700 dark:text-slate-100 border border-gray-500"
          >
            <Template.DetailLink
              className="p-2 cursor-pointer"
              object={temp?.id}
            >
              <div className="text-xl font-light mb-2">{temp?.node?.name}</div>
              <p className="text-sm">{temp?.node?.name}</p>
            </Template.DetailLink>
          </div>
        ))}
      </ResponsiveGrid>
    </div>
  );
};

export { MyTemplates };
