import React from "react";
import { useMiniTemplateByIdQuery } from "../../api/graphql";
import { withArkitekt } from "../../arkitekt";

interface MiniTemplateProps {
  template: string;
  className?: string;
}

export const MiniTemplate: React.FC<MiniTemplateProps> = ({
  template,
  className,
}) => {
  const { data, loading } = withArkitekt(useMiniTemplateByIdQuery)({
    variables: { id: template },
  });

  if (!data) return <>Loading</>;

  return <div className={className}>{data.template?.node?.name}</div>;
};
