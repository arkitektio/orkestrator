import React from "react";
import { SelfActions } from "../../components/SelfActions";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { MikroModel } from "../../linker";
import { withMikro } from "../MikroContext";
import { useDetailModelQuery } from "../api/graphql";

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
          content: <MikroModel.Komments object={id} />,
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
