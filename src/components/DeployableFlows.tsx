import React from "react";
import { useNavigate } from "react-router";
import { useNodesQuery } from "../arkitekt/api/graphql";
import { withArkitekt } from "../arkitekt/arkitekt";
import { notEmpty } from "../floating/utils";
import { SectionTitle } from "../layout/SectionTitle";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";
import { NodeCard } from "./MyNodes";

export type IMyNodesProps = {};

const DeployableFlows: React.FC<IMyNodesProps> = ({}) => {
  const { data, loading, subscribeToMore } = withArkitekt(useNodesQuery)({
    pollInterval: 30000,
    variables: {
      interfaces: ["workflow"],
    },
  });

  const navigate = useNavigate();

  return (
    <div>
      <SectionTitle>Deployable Flows</SectionTitle>
      <br />
      <ResponsiveGrid>
        {data?.allnodes?.filter(notEmpty).map((n, index) => (
          <NodeCard key={index} node={n} />
        ))}
      </ResponsiveGrid>
    </div>
  );
};

export { DeployableFlows };
