import React from "react";
import { useParams } from "react-router";
import Timestamp from "react-timestamp";
import { ResponsiveContainerGrid } from "../../../components/layout/ResponsiveContainerGrid";
import { ResponsiveGrid } from "../../../components/layout/ResponsiveGrid";
import { RepresentationCard } from "../../../components/MyRepresentations";
import { notEmpty } from "../../../floating/utils";
import { PageLayout } from "../../../layout/PageLayout";
import { SectionTitle } from "../../../layout/SectionTitle";
import {
  CommentableModels,
  useDetailOmeroFileQuery,
} from "../../../mikro/api/graphql";
import { ExperimentCard } from "../../../mikro/components/cards/ExperimentCard";
import CommentSection from "../../../mikro/components/comments/CommentSection";
import { useMikro, withMikro } from "../../../mikro/MikroContext";

export interface DataFileProps {}

export const OmeroFile: React.FC<{ id: string }> = ({ id }) => {
  const { data } = withMikro(useDetailOmeroFileQuery)({ variables: { id } });
  const { s3resolve } = useMikro();

  return (
    <PageLayout
      actions={
        <>
          {data?.omerofile?.file && (
            <a
              className="flex text-white font-semibold items-center cursor-pointer z-50 border-primary-400 bg-primary-300 p-3 rounded-full"
              href={s3resolve && s3resolve(data?.omerofile?.file)}
              download={data?.omerofile?.name}
              rel="noopener noreferrer"
              target={"_blank"}
            >
              Download
            </a>
          )}
        </>
      }
      sidebar={
        <div className="p-5">
          <CommentSection id={id} model={CommentableModels.GrunnlagOmerofile} />
        </div>
      }
    >
      <div className="p-2">
        <div className="text-xl font-semibold text-white flex flex-col">
          {data?.omerofile?.name}
          <div className="flex-grow"></div>
        </div>

        <div className="flex  flex-col rounded-md gap-1 mt-2 bg-white p-3">
          <div className="font-light mt-2 ">Uploaded At</div>
          <div className="text-md ">
            <Timestamp date={data?.omerofile?.createdAt} />
          </div>
          <div className="font-light mt-2 ">Type</div>
          <div className="text-md ">{data?.omerofile?.type}</div>
          <div className="font-light mt-2 ">Created</div>
          <ResponsiveContainerGrid>
            {data?.omerofile?.derivedRepresentations
              .filter(notEmpty)
              .map((rep, index) => (
                <RepresentationCard rep={rep} key={rep?.id} />
              ))}
          </ResponsiveContainerGrid>
          <div className="font-light mt-2 ">In experiments</div>
          <ResponsiveContainerGrid>
            {data?.omerofile?.experiments.filter(notEmpty).map((ex, index) => (
              <ExperimentCard experiment={ex} key={index} />
            ))}
          </ResponsiveContainerGrid>
        </div>
      </div>
    </PageLayout>
  );
};

export const DataFile: React.FC<DataFileProps> = (props) => {
  const { file } = useParams();
  return file ? <OmeroFile id={file} /> : <>Error</>;
};
