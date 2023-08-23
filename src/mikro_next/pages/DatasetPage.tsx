import React from "react";
import { BsPinAngle, BsPinFill } from "react-icons/bs";
import { useParams } from "react-router";
import Timestamp from "react-timestamp";
import { SelfActions } from "../../components/SelfActions";
import { DropZone } from "../../components/layout/DropZone";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { withMikroNext } from "../MikroNextContext";
import {
  useGetDatasetQuery,
  usePinDatasetMutation,
  usePutDatasetsInDatasetMutation,
  usePutImagesInDatasetMutation,
  useReleaseDatasetsFromDatasetMutation,
  useReleaseImagesFromDatasetMutation,
} from "../api/graphql";
import DatasetCard from "../components/cards/DatasetCard";
import FileCard from "../components/cards/FileCard";
import HistoryCard from "../components/cards/HistoryCard";
import ImageCard from "../components/cards/ImageCard";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <></>;

  const { data } = withMikroNext(useGetDatasetQuery)({
    variables: {
      id: id,
    },
  });

  const [pinDataset] = withMikroNext(usePinDatasetMutation)();
  const [putDatasets] = withMikroNext(usePutDatasetsInDatasetMutation)();
  const [releaseDatasets] = withMikroNext(
    useReleaseDatasetsFromDatasetMutation
  )();
  const [putImages] = withMikroNext(usePutImagesInDatasetMutation)();
  const [releaseImage] = withMikroNext(useReleaseImagesFromDatasetMutation)();

  return (
    <PageLayout actions={<SelfActions type="@mikronext/dataset" object={id} />}>
      <div className="p-3 flex-grow flex flex-col">
        <div className="flex flex-row">
          <div className="flex">
            <SectionTitle>{data?.dataset?.name}</SectionTitle>
          </div>
          <div className="flex-grow" />
          <div className="flex text-white">
            {data?.dataset?.id && (
              <button
                type="button"
                onClick={() =>
                  pinDataset({
                    variables: {
                      id: data?.dataset?.id || "",
                      pin: !data?.dataset?.pinned || false,
                    },
                  })
                }
              >
                {data?.dataset?.pinned ? <BsPinFill /> : <BsPinAngle />}
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col bg-white p-3 rounded rounded-md mt-2 mb-2">
          <div className="font-light mt-2 ">Created At</div>
          <div className="text-md mt-2 ">
            <Timestamp date={data?.dataset?.createdAt} />
          </div>
          <div className="font-light mt-2 ">Created by</div>
          <div className="font-light mt-2 ">Provenance</div>
          <div className="text-md mt-2 ">
            {data?.dataset?.history?.map((history, index) => (
              <HistoryCard key={index} history={history} />
            ))}
          </div>

          <div className="font-light mt-2 ">Tags</div>
          <div className="text-xl flex mb-2">
            {data?.dataset?.tags?.map((tag, index) => (
              <>
                <span className="font-semibold mr-2">#{tag} </span>
              </>
            ))}
          </div>
        </div>
        <SectionTitle> Datasets </SectionTitle>
        <ResponsiveContainerGrid>
          {data?.dataset?.children?.map((sample) => (
            <DatasetCard dataset={sample} />
          ))}
          <DropZone
            accepts={["item:@mikro/dataset", "list:@mikro/dataset"]}
            className="border border-gray-800 cursor-pointer rounded p-5 text-white bg-gray-900 hover:shadow-lg truncate"
            onDrop={async (item) => {
              await putDatasets({
                variables: {
                  selfs: item.map((i) => i.object),
                  other: id,
                },
              });
            }}
            canDropLabel={"Drag datasets here to associated with this Dataset"}
            overLabel={"Release to add"}
          />
        </ResponsiveContainerGrid>
        <SectionTitle> Samples </SectionTitle>
        <SectionTitle> Images </SectionTitle>
        <ResponsiveContainerGrid>
          {data?.dataset?.images?.map((rep, index) => (
            <ImageCard image={rep} key={index} />
          ))}
          <DropZone
            accepts={[
              "item:@mikro/representation",
              "list:@mikro/representation",
            ]}
            className="border border-gray-800 cursor-pointer rounded p-5 text-white bg-gray-900 hover:shadow-lg truncate"
            onDrop={async (item) => {
              await putImages({
                variables: {
                  selfs: item.map((i) => i.object),
                  other: id,
                },
              });
            }}
            canDropLabel={"Drag images here to associated with this Experiment"}
            overLabel={"Release to add"}
          />
        </ResponsiveContainerGrid>
        <SectionTitle> Files </SectionTitle>
        <ResponsiveContainerGrid>
          {data?.dataset?.files?.map((omerofile) => (
            <FileCard file={omerofile} />
          ))}
        </ResponsiveContainerGrid>
      </div>
    </PageLayout>
  );
};

export default Page;
