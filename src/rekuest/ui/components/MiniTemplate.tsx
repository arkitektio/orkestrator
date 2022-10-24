import React from "react";
import { useMiniTemplateByIdQuery } from "../../api/graphql";
import { withRekuest } from "../../RekuestContext";

interface MiniTemplateProps {
  template: string;
  className?: string;
}

export const MiniTemplate: React.FC<MiniTemplateProps> = ({
  template,
  className,
}) => {
  const { data, loading } = withRekuest(useMiniTemplateByIdQuery)({
    variables: { id: template },
  });

  if (!data) return <>Loading</>;

  return <div className={className}>{data.template?.node?.name}</div>;
};
