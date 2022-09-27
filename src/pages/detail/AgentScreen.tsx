import React from "react";
import { useNavigate, useParams } from "react-router";
import { useDetailAgentQuery } from "../../arkitekt/api/graphql";
import { withArkitekt } from "../../arkitekt/arkitekt";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";

export type IAppProps = {};

const AgentScreen: React.FC<IAppProps> = ({}) => {
  const { agentid } = useParams<{ agentid: string }>();

  if (!agentid) return <></>;
  const { data, error, loading } = withArkitekt(useDetailAgentQuery)({
    variables: { id: agentid },
  });

  const navigate = useNavigate();
  if (error) return <>'nanana'</>;
  if (loading) return <>'ss'</>;
  return (
    <>
      <div className="h-full text-black">
        <div className="p-6">
          <div className="font-light text-xl">{data?.agent?.name}</div>
          <br />
          <div className="font-light text-xl mt-3">Templates</div>
          <ResponsiveGrid>
            {data?.agent?.registry?.templates.map((template) => (
              <div
                className="cols-span-1 bg-white border rounded p-5 shadow-md cursor-pointer"
                onClick={() => navigate(`/template/${template.id}`)}
              >
                {template.node.name}
                <br />
                <br />
              </div>
            ))}
          </ResponsiveGrid>
        </div>
      </div>
    </>
  );
};

export { AgentScreen };
