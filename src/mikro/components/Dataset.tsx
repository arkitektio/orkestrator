import { Form, Formik } from "formik";
import React, { useState } from "react";
import { BsPinAngle, BsPinFill, BsTrash } from "react-icons/bs";
import { useNavigate } from "react-router";
import Timestamp from "react-timestamp";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { ParagraphInputField } from "../../components/forms/fields/paragraph_input";
import { CreateableSearchSelect } from "../../components/forms/fields/search_select_input";
import { TextInputField } from "../../components/forms/fields/text_input";
import { DropZone } from "../../components/layout/DropZone";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { SelfActions } from "../../components/SelfActions";
import { notEmpty } from "../../floating/utils";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { MikroFile, Representation, Sample } from "../../linker";
import {
  CommentableModels,
  DetailExperimentDocument,
  UpdateExperimentMutationVariables,
  useDeleteSampleMutation,
  useDetailExperimentQuery,
  usePinExperimentMutation,
  useTagSearchLazyQuery,
  useUpdateExperimentMutation,
  useAssociateSamplesMutation,
  useAssociateFilesMutation,
  useUnassociateFilesMutation,
  useUnassociateSamplesMutation,
  useUploadOmeroFileMutation,
  DetailExperimentQuery,
  useDetailDatasetQuery,
  usePutSamplesMutation,
  usePutFilesMutation,
  useReleaseFilesMutation,
  useReleaseSamplesMutation,
  useUpdateDatasetMutation,
  usePinDatasetMutation,
  useReleaseRepresentationsMutation,
  usePutRepresentationsMutation,
} from "../api/graphql";
import { withMikro } from "../MikroContext";
import CommentSection from "./comments/CommentSection";
import { UploadZone } from "./UploadZone";

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
  const [releaseFiles] = withMikro(useReleaseFilesMutation)();
  const [releaseSamples] = withMikro(useReleaseSamplesMutation)();
  const [releaseRepresentations] = withMikro(
    useReleaseRepresentationsMutation
  )();

  const [searchTags, _t] = withMikro(useTagSearchLazyQuery)();
  const [show, setshow] = useState(false);

  const [updateDataset] = withMikro(useUpdateDatasetMutation)();
  const [pinDataset] = withMikro(usePinDatasetMutation)();

  const { confirm } = useConfirm();
  const [uploadFile] = withMikro(useUploadOmeroFileMutation)({
    update(cache, result) {
      const existing = cache.readQuery<DetailExperimentQuery>({
        query: DetailExperimentDocument,
        variables: { id: id },
      });
      cache.writeQuery({
        query: DetailExperimentDocument,
        variables: { id: id },
        data: {
          experiment: {
            ...existing?.experiment,
            omeroFiles: [
              ...(existing?.experiment?.omeroFiles || []),
              result.data?.uploadOmeroFile,
            ],
          },
        },
      });
    },
  });

  return (
    <PageLayout
      sidebar={
        <div className="p-5">
          <CommentSection id={id} model={CommentableModels.GrunnlagDataset} />
        </div>
      }
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
                className="border border-gray-600 rounded w-fit p-1"
                onClick={() => setshow(!show)}
              >
                {show ? "Hide" : "Edit"}
              </button>
            </div>
          </div>
          <SectionTitle> Samples </SectionTitle>
          <ResponsiveContainerGrid>
            {data?.dataset?.samples?.filter(notEmpty).map((sample) => (
              <Sample.Smart
                object={sample.id}
                className="border border-gray-800 cursor-pointer rounded p-5 text-white bg-gray-900 hover:shadow-lg"
                additionalMates={(partner, self) => {
                  if (
                    partner == "item:@mikro/sample" ||
                    partner == "list:@mikro/sample"
                  ) {
                    return [
                      {
                        label: "Remove from Experiment",
                        async action(self, drops) {
                          releaseSamples({
                            variables: {
                              dataset: id,
                              samples: drops.map((d) => d.object),
                            },
                          });
                        },
                      },
                    ];
                  }

                  return [];
                }}
              >
                <div className="flex truncate">
                  <Sample.DetailLink
                    className="flex-grow cursor-pointer font-semibold"
                    object={sample.id}
                  >
                    {sample?.name}
                  </Sample.DetailLink>
                </div>
              </Sample.Smart>
            ))}
            <DropZone
              accepts={["item:@mikro/sample", "list:@mikro/sample"]}
              className="border border-gray-800 cursor-pointer rounded p-5 text-white bg-gray-900 hover:shadow-lg"
              onDrop={async (item) => {
                await putSamples({
                  variables: {
                    dataset: id,
                    samples: item.map((i) => i.object),
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
            {data?.dataset?.representations?.filter(notEmpty).map((sample) => (
              <Representation.Smart
                object={sample.id}
                className="border border-gray-800 cursor-pointer rounded p-5 text-white bg-gray-900 hover:shadow-lg"
                additionalMates={(partner, self) => {
                  if (
                    partner == "item:@mikro/sample" ||
                    partner == "list:@mikro/sample"
                  ) {
                    return [
                      {
                        label: "Remove from Dataset",
                        async action(self, drops) {
                          releaseRepresentations({
                            variables: {
                              dataset: id,
                              representations: drops.map((d) => d.object),
                            },
                          });
                        },
                      },
                    ];
                  }

                  return [];
                }}
              >
                <div className="flex truncate">
                  <Representation.DetailLink
                    className="flex-grow cursor-pointer font-semibold"
                    object={sample.id}
                  >
                    {sample?.name}
                  </Representation.DetailLink>
                </div>
              </Representation.Smart>
            ))}
            <DropZone
              accepts={[
                "item:@mikro/representation",
                "list:@mikro/representation",
              ]}
              className="border border-gray-800 cursor-pointer rounded p-5 text-white bg-gray-900 hover:shadow-lg"
              onDrop={async (item) => {
                await putRepresentations({
                  variables: {
                    dataset: id,
                    representations: item.map((i) => i.object),
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
              <MikroFile.Smart
                object={omerofile.id}
                className="border border-gray-800 cursor-pointer rounded  text-white bg-gray-900 hover:shadow-lg "
                additionalMates={(partner, self) => {
                  if (
                    partner == "item:@mikro/omerofile" ||
                    partner == "list:@mikro/omerofile"
                  ) {
                    return [
                      {
                        label: "Remove from Experiment",
                        async action(self, drops) {
                          releaseFiles({
                            variables: {
                              dataset: id,
                              files: drops.map((d) => d.object),
                            },
                          });
                        },
                      },
                    ];
                  }

                  return [];
                }}
              >
                <div className="truncate p-5">
                  <MikroFile.DetailLink
                    className="flex-grow cursor-pointer font-semibold"
                    object={omerofile.id}
                  >
                    {omerofile?.name}
                  </MikroFile.DetailLink>
                </div>
              </MikroFile.Smart>
            ))}

            <UploadZone
              uploadFile={uploadFile}
              additionalVariables={{ datasets: [id] }}
            />

            <DropZone
              accepts={["item:@mikro/omerofile", "list:@mikro/omerofile"]}
              className="border border-gray-800 cursor-pointer rounded p-5 text-white bg-gray-900 hover:shadow-lg"
              onDrop={async (item) => {
                await putFiles({
                  variables: {
                    dataset: id,
                    files: item.map((i) => i.object),
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
