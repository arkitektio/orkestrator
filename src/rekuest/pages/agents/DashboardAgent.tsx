import React from "react";
import { useParams } from "react-router";
import { withRekuest } from "../..";
import { PageLayout } from "../../../layout/PageLayout";
import { ListRender } from "../../../layout/SectionTitle";
import { useProvideMate } from "../../../mates/template/useLinkProvisionMate";
import { useTemplateActionMate } from "../../../mates/template/useTemplateActionsMate";
import { useDetailAgentQuery } from "../../api/graphql";
import { ProvisionCard } from "../../components/cards/ProvisionCard";
import { TemplateCard } from "../../components/cards/TemplateCard";

export interface DashboardAgentProps {}

export const DashboardAgent: React.FC<DashboardAgentProps> = (props) => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <>ssss</>;

  const { data } = withRekuest(useDetailAgentQuery)({
    variables: { id },
  });

  const provideMate = useProvideMate();
  const reserveMate = useTemplateActionMate();

  return (
    <PageLayout>
      <div className="text-white">
        <div className="flex flex-row items-center">
          {data?.agent?.registry?.app?.identifier}:
          {data?.agent?.registry?.app?.version} used by
          {data?.agent?.registry?.user?.sub} on
          {data?.agent?.instanceId}
        </div>
        <ListRender array={data?.agent?.provisions} title="Provisions">
          {(p) => <ProvisionCard provision={p} mates={[]} />}
        </ListRender>
        <ListRender array={data?.agent?.templates} title="Templates">
          {(t) => (
            <TemplateCard
              template={t}
              mates={[provideMate(t), reserveMate(t)]}
            />
          )}
        </ListRender>
      </div>
    </PageLayout>
  );
};
