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
import { notEmpty } from "../../floating/utils";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { MikroFile, Sample } from "../../linker";
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
} from "../api/graphql";
import { withMikro } from "../MikroContext";
import CommentSection from "./comments/CommentSection";
import { UploadZone } from "./UploadZone";

export type IExperimentProps = {
  id: string;
};

const Experiment: React.FC<IExperimentProps> = ({ id }) => {
  const { data, error } = withMikro(useDetailExperimentQuery)({
    variables: { id: id },
  });

  const [associateSamples] = withMikro(useAssociateSamplesMutation)();
  const [associateFiles] = withMikro(useAssociateFilesMutation)();
  const [unassociateFiles] = withMikro(useUnassociateFilesMutation)();
  const [unassociateSamples] = withMikro(useUnassociateSamplesMutation)();

  const [searchTags, _t] = withMikro(useTagSearchLazyQuery)();
  const [show, setshow] = useState(false);

  const [updateExperiment] = withMikro(useUpdateExperimentMutation)();
  const [pinExperiment] = withMikro(usePinExperimentMutation)();

  const { confirm } = useConfirm();

  const [deleteSample] = withMikro(useDeleteSampleMutation)({
    update(cache, result) {
      const existing: any = cache.readQuery({
        query: DetailExperimentDocument,
        variables: { id: id },
      });
      cache.writeQuery({
        query: DetailExperimentDocument,
        variables: { id: id },
        data: {
          experiment: {
            ...existing.experiment,
            samples: existing.experiment.samples.filter(
              (t: any) => t.id !== result.data?.deleteSample?.id
            ),
          },
        },
      });
    },
  });

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
          <CommentSection
            id={id}
            model={CommentableModels.GrunnlagExperiment}
          />
        </div>
      }
    >
      {!error && data && (
        <div className="p-3 flex-grow flex flex-col">
          <div className="flex flex-row">
            <div className="flex">
              <SectionTitle>{data?.experiment?.name}</SectionTitle>
            </div>
            <div className="flex-grow" />
            <div className="flex text-white">
              {data?.experiment?.id && (
                <button
                  onClick={() =>
                    pinExperiment({
                      variables: {
                        id: data?.experiment?.id || "",
                        pin: !data?.experiment?.pinned || false,
                      },
                    })
                  }
                >
                  {data?.experiment?.pinned ? <BsPinFill /> : <BsPinAngle />}
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col bg-white p-3 rounded rounded-md mt-2 mb-2">
            <div className="font-light mt-2 ">Description</div>
            <div className="text-md mt-2 ">{data?.experiment?.description}</div>
            <div className="font-light mt-2 ">Created At</div>
            <div className="text-md mt-2 ">
              <Timestamp date={data?.experiment?.createdAt} />
            </div>
            <div className="font-light mt-2 ">Created by</div>
            <div className="text-md mt-2 ">
              {data?.experiment?.creator?.email}
            </div>

            <div className="font-light mt-2 ">Tags</div>
            <div className="text-xl flex mb-2">
              {data?.experiment?.tags?.map((tag, index) => (
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
            {data?.experiment && show && (
              <Formik<UpdateExperimentMutationVariables>
                initialValues={{
                  id: data?.experiment?.id,
                  tags: data?.experiment?.tags,
                  name: data?.experiment?.name,
                  description: data?.experiment?.description,
                }}
                onSubmit={(values) => {
                  updateExperiment({ variables: values })
                    .then(console.log)
                    .then(() => setshow(false));
                }}
              >
                {() => (
                  <Form>
                    <div className="border-t border-gray-300 pt-2">
                      <TextInputField name="name" label="Name" />
                      <ParagraphInputField
                        name="description"
                        label="Description"
                      />
                      <div className="flex-grow">
                        <CreateableSearchSelect
                          name="tags"
                          isMulti={true}
                          label="Tags"
                          lazySearch={searchTags}
                        />
                      </div>
                      <button
                        type="submit"
                        className="border border-gray-600 rounded w-fit p-1 focus:border-green-300"
                        autoFocus={true}
                      >
                        Change
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            )}
          </div>
          <SectionTitle> Samples </SectionTitle>
          <ResponsiveContainerGrid>
            {data?.experiment?.samples?.filter(notEmpty).map((sample) => (
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
                          unassociateSamples({
                            variables: {
                              experiment: id,
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
                <div className="flex">
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
                await associateSamples({
                  variables: {
                    experiment: id,
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
          <SectionTitle> Files </SectionTitle>
          <ResponsiveContainerGrid>
            {data?.experiment?.omeroFiles?.filter(notEmpty).map((omerofile) => (
              <MikroFile.Smart
                object={omerofile.id}
                className="border border-gray-800 cursor-pointer rounded p-5 text-white bg-gray-900 hover:shadow-lg"
                additionalMates={(partner, self) => {
                  if (
                    partner == "item:@mikro/omerofile" ||
                    partner == "list:@mikro/omerofile"
                  ) {
                    return [
                      {
                        label: "Remove from Experiment",
                        async action(self, drops) {
                          unassociateFiles({
                            variables: {
                              experiment: id,
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
                <div className="flex">
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
              additionalVariables={{ experiments: [id] }}
            />

            <DropZone
              accepts={["item:@mikro/omerofile", "list:@mikro/omerofile"]}
              className="border border-gray-800 cursor-pointer rounded p-5 text-white bg-gray-900 hover:shadow-lg"
              onDrop={async (item) => {
                await associateFiles({
                  variables: {
                    experiment: id,
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

export { Experiment };
