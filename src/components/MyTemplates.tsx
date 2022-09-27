import React from "react";
import { useNavigate } from "react-router";
import { useTemplatesQuery } from "../arkitekt/api/graphql";
import { withArkitekt } from "../arkitekt/arkitekt";
import { notEmpty } from "../floating/utils";
import { SectionTitle } from "../layout/SectionTitle";
import { Template } from "../linker";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";
import { Modal } from "./modals/Modal";

export type IMyNodesProps = {};

const MyTemplates: React.FC<IMyNodesProps> = ({}) => {
  const { data, loading, subscribeToMore } = withArkitekt(useTemplatesQuery)({
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
              <p className="text-sm">
                {temp?.node?.package} on {temp?.node?.interface}
              </p>
            </Template.DetailLink>
          </div>
        ))}
      </ResponsiveGrid>
    </div>
  );
};

export { MyTemplates };
