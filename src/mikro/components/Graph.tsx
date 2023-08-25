import { useDatalayer } from "@jhnnsrs/datalayer";
import React from "react";
import { SelfActions } from "../../components/SelfActions";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { MikroGraph } from "../../linker";
import { useDeleteLinkMate } from "../../mates/link/useDeleteFileMate";
import { useDeleteModelMate } from "../../mates/model/useDeleteModelMate";
import { useConfirm } from "../../providers/confirmer/confirmer-context";
import { withMikro } from "../MikroContext";
import { useDetailGraphQuery } from "../api/graphql";

export type IExperimentProps = {
  id: string;
};

const Graph: React.FC<IExperimentProps> = ({ id }) => {
  const { data, error } = withMikro(useDetailGraphQuery)({
    variables: { id: id },
  });
  const { s3resolve } = useDatalayer();
  const deleteLinkMate = useDeleteLinkMate();
  const deleteModelMate = useDeleteModelMate();

  const { confirm } = useConfirm();

  return (
    <PageLayout
      sidebars={[
        {
          label: "Comments",
          content: <MikroGraph.Komments object={id} />,
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
            <SectionTitle>{data?.graph?.name}</SectionTitle>
          </div>
          <div className="flex-initial text-slate-200"></div>
          <SectionTitle> The Graph </SectionTitle>
          {data?.graph?.image && <img src={s3resolve(data?.graph?.image)} />}
        </div>
      )}
    </PageLayout>
  );
};

export { Graph };
