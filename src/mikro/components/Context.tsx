import React from "react";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { SelfActions } from "../../components/SelfActions";
import { notEmpty } from "../../floating/utils";
import { MikroKomments } from "../../komment/MikroKomments";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { Link, Model } from "../../linker";
import {
  CommentableModels,
  useDetailContextQuery,
  usePinExperimentMutation,
  useUpdateExperimentMutation,
} from "../api/graphql";
import { withMikro } from "../MikroContext";
import { LinkCard } from "./cards/LinkCard";

export type IExperimentProps = {
  id: string;
};

const Context: React.FC<IExperimentProps> = ({ id }) => {
  const { data, error } = withMikro(useDetailContextQuery)({
    variables: { id: id },
  });

  const [updateExperiment] = withMikro(useUpdateExperimentMutation)();
  const [pinExperiment] = withMikro(usePinExperimentMutation)();

  const { confirm } = useConfirm();

  return (
    <PageLayout
      sidebars={[
        {
          label: "Comments",
          content: (
            <MikroKomments id={id} model={CommentableModels.GrunnlagContext} />
          ),
          key: "comments",
        },
      ]}
      help={
        <>
          Contexts relate arbitary data items together in a one to one
          relationship (left to right). This can be a helpful way to model
          relationships in data that have no natural relationship in the data
          itself, e.g if one dataset is the ground truth for another.
        </>
      }
      actions={<SelfActions type="@mikro/context" object={id} />}
    >
      {!error && data && (
        <div className="p-3 flex-grow flex flex-col">
          <div className="flex mb-4">
            <SectionTitle>{data?.context?.name}</SectionTitle>
          </div>
          <div className="flex-initial text-slate-200"></div>
          <SectionTitle> Relates </SectionTitle>
          <div className="grid grid-cols-1">
            {data.context?.links.filter(notEmpty).map((link) => (
              <LinkCard key={link.id} link={link} minimal />
            ))}
          </div>
          <SectionTitle> Created Models </SectionTitle>
          <ResponsiveGrid>
            {data.context?.models.map((m) => (
              <Model.Smart
                object={m.id}
                className="flex flex-row p-2 bg-gray-800 truncate text-gray-200 rounded"
              >
                <Model.DetailLink object={m.id} className="flex-initial">
                  {m.name}
                </Model.DetailLink>
              </Model.Smart>
            ))}
          </ResponsiveGrid>
        </div>
      )}
    </PageLayout>
  );
};

export { Context };
