import { useDatalayer } from "@jhnnsrs/datalayer";
import React, { useState } from "react";
import { BsPinAngle, BsPinFill } from "react-icons/bs";
import Timestamp from "react-timestamp";
import { SelfActions } from "../../components/SelfActions";
import { DropZone } from "../../components/layout/DropZone";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../floating/utils";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { MikroDataset } from "../../linker";
import { usePutDatasetsMate } from "../../mates/dataset/usePutDatasetsMate";
import { useDeleteFileMate } from "../../mates/file/useDeleteFileMate";
import { useDownloadFileMate } from "../../mates/file/useDownloadFileMate";
import { useReleaseFileMate } from "../../mates/file/useReleaseFileMate";
import { useReleaseRepresentationMate } from "../../mates/representation/useReleaseRepresentationMate";
import { useReleaseSampleMate } from "../../mates/sample/useReleaseSampleMate";
import { useConfirm } from "../../providers/confirmer/confirmer-context";
import { withMikro } from "../MikroContext";
import {
  DetailDatasetDocument,
  DetailDatasetQuery,
  useDetailDatasetQuery,
  usePinDatasetMutation,
  usePutDatasetsMutation,
  usePutFilesMutation,
  usePutRepresentationsMutation,
  usePutSamplesMutation,
  useTagSearchLazyQuery,
  useUpdateDatasetMutation,
  useUploadBigFileMutation,
} from "../api/graphql";
import { UploadZone } from "./UploadZone";
import { DatasetCard } from "./cards/DatasetCard";
import { FileCard } from "./cards/FileCard";
import { RepresentationCard } from "./cards/RepresentationCard";
import { SampleCard } from "./cards/SampleCard";

export type IExperimentProps = {
  id: string;
};

const Dataset: React.FC<IExperimentProps> = ({ id }) => {
  const { data, error } = withMikro(useDetailDatasetQuery)({
    variables: { id: id },
  });

  const [putSamples] = withMikro(usePutSamplesMutation)();
  const [putFiles] = withMikro(usePutFilesMutation)();

  const [putRepresentations] = withMikro(usePutRepresentationsMutation)();

  const relaseFileMate = useReleaseFileMate(id);
  const deleteFileMate = useDeleteFileMate();
  const downloadMate = useDownloadFileMate();

  const [putDatasets] = withMikro(usePutDatasetsMutation)();
  const putDatasetsMate = usePutDatasetsMate(id);
  const releaseDatasetsMate = usePutDatasetsMate(id);

  const releaseSampleMate = useReleaseSampleMate(id);
  const releaseRepresentationMate = useReleaseRepresentationMate(id);

  const [searchTags, _t] = withMikro(useTagSearchLazyQuery)();
  const [show, setshow] = useState(false);

  const [updateDataset] = withMikro(useUpdateDatasetMutation)();
  const [pinDataset] = withMikro(usePinDatasetMutation)();

  const { upload } = useDatalayer();

  const { confirm } = useConfirm();

  const [uploadFile] = withMikro(useUploadBigFileMutation)({
    update(cache, result) {
      const existing = cache.readQuery<DetailDatasetQuery>({
        query: DetailDatasetDocument,
        variables: { id: id },
      });
      cache.writeQuery({
        query: DetailDatasetDocument,
        variables: { id: id },
        data: {
          dataset: {
            ...existing?.dataset,
            omerofiles: [
              ...(existing?.dataset?.omerofiles || []),
              result.data?.uploadBigFile,
            ],
          },
        },
      });
    },
  });

  return (
    <PageLayout
      sidebars={[
        {
          key: "comments",
          label: "Comments",
          content: <MikroDataset.Komments object={id} />,
        },
      ]}
      actions={<SelfActions type="@mikro/dataset" object={id} />}
    >
      {!error && data && (
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
            <div className="text-md mt-2 ">
              {data?.dataset?.createdBy?.email}
            </div>

            <div className="font-light mt-2 ">Tags</div>
            <div className="text-xl flex mb-2">
              {data?.dataset?.tags?.map((tag, index) => (
                <>
                  <span className="font-semibold mr-2">#{tag} </span>
                </>
              ))}
            </div>
            <div className="flex flex-col mt-2">
              <button
                type="button"
                className="border border-gray-600 rounded w-fit p-1"
                onClick={() => setshow(!show)}
              >
                {show ? "Hide" : "Edit"}
              </button>
            </div>
          </div>
          <SectionTitle> Datasets </SectionTitle>
          <ResponsiveContainerGrid>
            {data?.dataset?.children?.filter(notEmpty).map((sample) => (
              <DatasetCard dataset={sample} mates={[releaseDatasetsMate]} />
            ))}
            <DropZone
              accepts={["@mikro/dataset"]}
              compareWithList={data?.dataset?.children}
              className="border border-gray-800 cursor-pointer rounded p-5 text-white bg-gray-900 hover:shadow-lg truncate"
              onDrop={async (item) => {
                await putDatasets({
                  variables: {
                    dataset: id,
                    datasets: item.map((i) => i.id),
                  },
                });
              }}
              canDropLabel={
                "Drag datasets here to associated with this Dataset"
              }
              overLabel={"Release to add"}
            />
          </ResponsiveContainerGrid>
          <SectionTitle> Samples </SectionTitle>
          <ResponsiveContainerGrid>
            {data?.dataset?.samples?.filter(notEmpty).map((sample) => (
              <SampleCard sample={sample} mates={[releaseSampleMate]} />
            ))}
            <DropZone
              accepts={["@mikro/sample"]}
              className="border border-gray-800 cursor-pointer rounded p-5 text-white bg-gray-900 hover:shadow-lg truncate"
              onDrop={async (item) => {
                await putSamples({
                  variables: {
                    dataset: id,
                    samples: item.map((i) => i.id),
                  },
                });
              }}
              canDropLabel={
                "Drag samples here to associated with this Experiment"
              }
              overLabel={"Release to add"}
            />
          </ResponsiveContainerGrid>
          <SectionTitle> Images </SectionTitle>
          <ResponsiveContainerGrid>
            {data?.dataset?.representations?.filter(notEmpty).map((rep) => (
              <RepresentationCard
                rep={rep}
                mates={[releaseRepresentationMate]}
              />
            ))}
            <DropZone
              accepts={["@mikro/representation"]}
              className="border border-gray-800 cursor-pointer rounded p-5 text-white bg-gray-900 hover:shadow-lg truncate"
              onDrop={async (item) => {
                await putRepresentations({
                  variables: {
                    dataset: id,
                    representations: item.map((i) => i.id),
                  },
                });
              }}
              canDropLabel={
                "Drag images here to associated with this Experiment"
              }
              overLabel={"Release to add"}
            />
          </ResponsiveContainerGrid>
          <SectionTitle> Files </SectionTitle>
          <ResponsiveContainerGrid>
            {data?.dataset?.omerofiles?.filter(notEmpty).map((omerofile) => (
              <FileCard
                file={omerofile}
                mates={[
                  relaseFileMate,
                  deleteFileMate(omerofile),
                  downloadMate(omerofile.file),
                ]}
              />
            ))}

            <UploadZone
              uploadFile={upload}
              createFile={(file, key) =>
                uploadFile({ variables: { file: key, datasets: [id] } })
              }
            />

            <DropZone
              accepts={["@mikro/omerofile"]}
              className="border border-gray-800 cursor-pointer rounded p-5 text-white bg-gray-900 hover:shadow-lg truncate"
              onDrop={async (item) => {
                await putFiles({
                  variables: {
                    dataset: id,
                    files: item.map((i) => i.id),
                  },
                });
              }}
              canDropLabel={
                "Drag files here to associated with this Experiment"
              }
              overLabel={"Release to add"}
            />
          </ResponsiveContainerGrid>
        </div>
      )}
    </PageLayout>
  );
};

export { Dataset };
