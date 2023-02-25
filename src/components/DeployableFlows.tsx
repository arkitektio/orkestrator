import React from "react";
import { useNavigate } from "react-router";
import { useNodesQuery } from "../rekuest/api/graphql";
import { notEmpty } from "../floating/utils";
import { SectionTitle } from "../layout/SectionTitle";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";
import { NodeCard } from "./MyNodes";
import { withRekuest } from "../rekuest";
import { rekuestGuarded } from "../rekuest/RekuestGuard";

export type IMyNodesProps = {};

const DeployableFlows: React.FC<IMyNodesProps> = rekuestGuarded(({}) => {
  const { data, loading, subscribeToMore } = withRekuest(useNodesQuery)({
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
});

export { DeployableFlows };
