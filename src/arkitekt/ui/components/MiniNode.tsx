import React from "react";
import { useMiniNodeByIdQuery } from "../../api/graphql";
import { withArkitekt } from "../../arkitekt";

interface MiniNodeProps {
  node: string;
  className?: string;
}

export const MiniNode: React.FC<MiniNodeProps> = ({ node, className }) => {
  const { data, loading } = withArkitekt(useMiniNodeByIdQuery)({
    variables: { id: node },
  });

  if (!data) return <>Loading</>;

  return <div className={className}>{data.node?.name}</div>;
};
