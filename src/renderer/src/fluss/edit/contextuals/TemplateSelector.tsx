import { Button } from "@/core/ui/button";
import { useImplementationsQuery } from "@/rekuest/api/graphql";
import { useMemo } from "react";

export const TemplateSelector = (props: {
  node: string;
  hash: string;
  onClick: (node: string, template: string) => void;
}) => {
  const variables = useMemo(() => ({ filters: { actionHash: props.hash } }), [props.hash]);
  const { data } = useImplementationsQuery({ variables });

  return (
    <>
      {data?.implementations?.map((template) => (
        <Button
          key={template.id}
          onClick={() => props.onClick(props.node, template.id)}
          className="px-2 py-1 rounded-full"
        >
          {template.agent.name}
        </Button>
      ))}
    </>
  );
};
