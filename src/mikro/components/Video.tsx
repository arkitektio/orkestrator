import { useDatalayer } from "@jhnnsrs/datalayer";
import React from "react";
import ReactPlayer from "react-player";
import { SelfActions } from "../../components/SelfActions";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { MikroKomments } from "../../komment/MikroKomments";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { useDeleteLinkMate } from "../../mates/link/useDeleteFileMate";
import { useDeleteModelMate } from "../../mates/model/useDeleteModelMate";
import { withMikro } from "../MikroContext";
import { CommentableModels, useDetailVideoQuery } from "../api/graphql";

export type IExperimentProps = {
  id: string;
};

const Video: React.FC<IExperimentProps> = ({ id }) => {
  const { data, error } = withMikro(useDetailVideoQuery)({
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
            <SectionTitle>{data?.video?.id}</SectionTitle>
          </div>
          <div className="flex-initial text-slate-200"></div>
          {data?.video?.data && (
            <ReactPlayer
              url={s3resolve(data?.video?.data)}
              playing={true}
              loop={true}
              className="border border-1 border-slate-200"
              controls={true}
            />
          )}
        </div>
      )}
    </PageLayout>
  );
};

export { Video };
