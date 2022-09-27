import { Form, Formik } from "formik";
import React, { useState } from "react";
import { BsTrash } from "react-icons/bs";
import { useNavigate } from "react-router";
import Timestamp from "react-timestamp";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { ParagraphInputField } from "../../components/forms/fields/paragraph_input";
import { CreateableSearchSelect } from "../../components/forms/fields/search_select_input";
import { TextInputField } from "../../components/forms/fields/text_input";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { notEmpty } from "../../floating/utils";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { Sample } from "../../linker";
import {
  CommentableModels,
  DetailExperimentDocument,
  UpdateExperimentMutationVariables,
  useDeleteSampleMutation,
  useDetailExperimentQuery,
  useTagSearchLazyQuery,
  useUpdateExperimentMutation,
} from "../api/graphql";
import { withMikro } from "../mikro-types";
import CommentSection from "./comments/CommentSection";

export type IExperimentProps = {
  id: string;
};

const Experiment: React.FC<IExperimentProps> = ({ id }) => {
  const { data, error } = withMikro(useDetailExperimentQuery)({
    variables: { id: id },
  });

  const [searchTags, _t] = withMikro(useTagSearchLazyQuery)();
  const [show, setshow] = useState(false);

  const [updateExperiment, _] = withMikro(useUpdateExperimentMutation)();

  const { confirm } = useConfirm();

  const [deleteSample] = withMikro(useDeleteSampleMutation)({
    update(cache, result) {
      const existing: any = cache.readQuery({
        query: DetailExperimentDocument,
        variables: { id: id },
      });
      cache.writeQuery({
        query: DetailExperimentDocument,
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
        <div className="p-3 flex-grow">
          <SectionTitle>{data?.experiment?.name}</SectionTitle>
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
          <ResponsiveGrid>
            {data?.experiment?.samples?.filter(notEmpty).map((sample) => (
              <Sample.Smart
                object={sample.id}
                className="border border-gray-800 cursor-pointer rounded p-5 text-white bg-gray-900 hover:shadow-lg"
              >
                <div className="flex">
                  <Sample.DetailLink
                    className="flex-grow cursor-pointer font-semibold"
                    object={sample.id}
                  >
                    {sample?.name}
                  </Sample.DetailLink>
                  <span
                    className="flex-none mt-1 text-white cursor-pointer group-hover:text-red-400"
                    onClick={() => {
                      if (sample?.id) {
                        confirm({
                          message: "Do you really want to delete this Sample?",
                          subtitle:
                            "This will also delete all images that are attached to it?! And it is irreversible!",
                          confirmLabel: "Yes delete!",
                        })
                          .then(() => {
                            deleteSample({
                              variables: { id: sample?.id },
                            });
                          })
                          .catch(console.log);
                      }
                    }}
                  >
                    <BsTrash />
                  </span>
                </div>
              </Sample.Smart>
            ))}
          </ResponsiveGrid>
        </div>
      )}
    </PageLayout>
  );
};

export { Experiment };
