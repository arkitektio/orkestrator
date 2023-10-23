import React from "react";
import { useParams } from "react-router";
import { withRekuest } from "../..";
import { PageLayout } from "../../../layout/PageLayout";
import { ListRender, SectionTitle } from "../../../layout/SectionTitle";
import { useProvideMate } from "../../../mates/template/useLinkProvisionMate";
import { useTemplateActionMate } from "../../../mates/template/useTemplateActionsMate";
import { useDetailAgentQuery } from "../../api/graphql";
import { ProvisionCard } from "../../components/cards/ProvisionCard";
import { TemplateCard } from "../../components/cards/TemplateCard";
import { UserEmblem } from "../../../lok/components/UserEmblem";
import { UserImage } from "../../../lok/components/UserImage";

export interface DashboardAgentProps {}

export const DashboardAgent: React.FC<DashboardAgentProps> = (props) => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <>ssss</>;

  const { data } = withRekuest(useDetailAgentQuery)({
    variables: { id },
  });

  const reserveMate = useTemplateActionMate();

  return (
    <PageLayout>
      <div className="text-white">
        <div className="flex flex-row items-center max-w-[20%] p-3 bg-back-800 rounded rounded-md">
          <div className="grid gap-2 grid-cols-2">
            <div className="flex flex-row gap-2"> App </div>
            <div className="flex flex-row gap-2">
              {data?.agent?.registry?.app?.identifier}
            </div>
            <div className="flex flex-row gap-2"> Version </div>
            <div className="flex flex-row gap-2">
              {data?.agent?.registry?.app?.version}
            </div>
            <div className="flex flex-row gap-2"> Instance </div>
            <div className="flex flex-row gap-2">{data?.agent?.instanceId}</div>
            <div className="flex flex-row gap-2"> User </div>
            <div className="flex flex-row gap-2">
              {data?.agent?.registry?.user?.sub && (
                <UserImage
                  sub={data?.agent?.registry?.user?.sub}
                  className="w-10 h-10"
                />
              )}
            </div>
          </div>
        </div>
        <ListRender array={data?.agent?.provisions} title="Provisions">
          {(p) => <ProvisionCard provision={p} mates={[]} />}
        </ListRender>
        <ListRender array={data?.agent?.templates} title="Defined Nodes">
          {(t) => (
            <TemplateCard template={t} noemblem mates={[reserveMate(t)]} />
          )}
        </ListRender>
      </div>
    </PageLayout>
  );
};
