import React, { useEffect, useState } from "react";
import { SelfActions } from "../../components/SelfActions";
import { MikroKomments } from "../../komment/MikroKomments";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { CommentableModels, useDetailModelQuery } from "../api/graphql";
import { withMikro } from "../MikroContext";

export type IExperimentProps = {
  id: string;
};

const Model: React.FC<IExperimentProps> = ({ id }) => {
  const { data, error } = withMikro(useDetailModelQuery)({
    variables: { id: id },
  });

  return (
    <PageLayout
      sidebars={[
        {
          label: "Comments",
          content: (
            <MikroKomments id={id} model={CommentableModels.GrunnlagModel} />
          ),
          key: "comments",
        },
      ]}
      actions={<SelfActions type="@mikro/context" object={id} />}
    >
      {!error && data && (
        <div className="p-3 flex-grow flex flex-col">
          <div className="flex">
            <SectionTitle>{data?.model?.name}</SectionTitle>
          </div>
          <div className="flex-grow text-white flex flex-col">
            {data.model?.contexts.map((c) => (
              <div className="flex flex-row">{c.name}</div>
            ))}
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export { Model };
