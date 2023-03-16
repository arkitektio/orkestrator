import { Form, Formik } from "formik";
import React, { useState } from "react";
import { BsTrash } from "react-icons/bs";
import { useNavigate } from "react-router";
import Timestamp from "react-timestamp";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import {
  CreateableListSearchInput,
  CreateableSearchInput,
  ListSearchInput,
  SearchInput,
} from "../../components/forms/fields/SearchInput";
import {
  CreateableSearchSelectInput,
  SearchSelectInput,
} from "../../components/forms/fields/search_select_input";
import { TextInputField } from "../../components/forms/fields/text_input";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { notEmpty } from "../../floating/utils";
import { MikroKomments } from "../../komment/MikroKomments";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { Experiment, Representation } from "../../linker";
import { useDeleteRepresentationMate } from "../../mates/representation/useDeleteRepresentationMate";
import {
  CommentableModels,
  DetailSampleDocument,
  UpdateSampleMutationVariables,
  useDeleteRepresentationMutation,
  useDetailSampleQuery,
  useSearchExperimentsLazyQuery,
  useTagSearchLazyQuery,
  useUpdateSampleMutation,
} from "../api/graphql";
import { useMikro, withMikro } from "../MikroContext";
import { RepresentationCard } from "./cards/RepresentationCard";

export type ISampleProps = {
  id: string;
};

function RepresentationSampleCard(props: any) {
  return (
    <Representation.Smart
      object={props.rep?.id || "34234"}
      dragClassName={({ isOver, canDrop }) =>
        `bg-slate-700 text-white rounded overflow-hidden shadow-md py-2 w-full px-2 pr-3 py-2 group ${
          isOver && "border-primary-200 border"
        }`
      }
      dragStyle={() =>
        props.rep?.latestThumbnail
          ? {
              backgroundImage: `url(${props.s3resolve(
                props.rep?.latestThumbnail?.image
              )}), linear-gradient(rgba(0,0,0,0.3), rgba(1,1,1,0.5))`,
              backgroundSize: "auto 100%",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right",
            }
          : {
              background: "linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.95))",
            }
      }
    >
      <div className="flex">
        <Representation.DetailLink
          className="flex-initial cursor-pointer font-semibold"
          object={props.rep.id}
        >
          {props.rep?.name}
        </Representation.DetailLink>
        <div className="flex-grow"></div>
        <span
          className="flex-none mt-1  cursor-pointer hidden group-hover:block text-red-400"
          onClick={(ev) => {
            if (props.rep?.id) {
              props._catch(console.log);
            }

            ev.stopPropagation();
          }}
        >
          <BsTrash />
        </span>
      </div>
      <div className="text-xl font-semibold"></div>
    </Representation.Smart>
  );
}

const Sample: React.FC<ISampleProps> = ({ id }) => {
  const { data } = withMikro(useDetailSampleQuery)({
    variables: { id: id },
  });

  const [show, setshow] = useState(false);

  const [searchExperiments, _s] = withMikro(useSearchExperimentsLazyQuery)();
  const [searchTags, _t] = withMikro(useTagSearchLazyQuery)();

  const [updateSample, _] = withMikro(useUpdateSampleMutation)();

  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const { s3resolve } = useMikro();

  const deleteRepresentationMate = useDeleteRepresentationMate();

  const [deleteRepresentation] = withMikro(useDeleteRepresentationMutation)({
    update(cache, result) {
      const existing: any = cache.readQuery({
        query: DetailSampleDocument,
        variables: { id: id },
      });
      cache.writeQuery({
        query: DetailSampleDocument,
        data: {
          sample: {
            ...existing.sample,
            representations: existing.sample.representations.filter(
              (t: any) => t.id !== result.data?.deleteRepresentation?.id
            ),
          },
        },
      });
    },
  });

  return (
    <PageLayout
      sidebars={[
        {
          label: "Comments",
          content: (
            <MikroKomments id={id} model={CommentableModels.GrunnlagSample} />
          ),
          key: "comments",
        },
      ]}
      actions={<></>}
    >
      <div className="p-3 flex-grow">
        <SectionTitle>{data?.sample?.name}</SectionTitle>
        <div className="flex flex-col bg-white p-3 rounded rounded-md mt-2 mb-2">
          <div className="font-light">Tags</div>
          <div className="text-xl flex mb-2">
            {data?.sample?.tags?.map((tag, index) => (
              <>
                <span className="font-semibold mr-2">#{tag} </span>
              </>
            ))}
          </div>
          <div className="font-light mt-2 ">Created At</div>
          <div className="text-md mt-2 ">
            <Timestamp date={data?.sample?.createdAt} />
          </div>
          <div className="font-light mt-2 ">Created by</div>
          <div className="text-md mt-2 ">{data?.sample?.creator?.email}</div>
          {data?.sample?.experiments && data.sample.experiments.length > 0 && (
            <>
              <div className="font-light">Experiments</div>
              <ResponsiveGrid>
                {data?.sample?.experiments.map((exp) => (
                  <Experiment.Smart
                    object={exp.id}
                    className="border border-gray-800  cursor-pointer rounded p-5 text-white bg-gray-900 hover:shadow-lg"
                  >
                    <Experiment.DetailLink object={exp.id}>
                      {exp.name}
                    </Experiment.DetailLink>
                  </Experiment.Smart>
                ))}
              </ResponsiveGrid>
            </>
          )}
          <div className="flex flex-col mt-2">
            <button
              type="button"
              className="border border-gray-600 rounded w-fit p-1"
              onClick={() => setshow(!show)}
            >
              {show ? "Hide" : "Edit"}
            </button>
          </div>
          {data?.sample && show && (
            <Formik<UpdateSampleMutationVariables>
              initialValues={{
                id: data?.sample?.id,
                experiments: data?.sample?.experiments.map((e) => e.id),
                tags: data?.sample?.tags,
                name: data?.sample?.name,
              }}
              onSubmit={(values) => {
                updateSample({ variables: values })
                  .then(console.log)
                  .then(() => setshow(false));
              }}
            >
              {() => (
                <Form>
                  <TextInputField name="name" label="Name" />
                  <div className="flex-grow"></div>
                  <div className="flex-grow">
                    <ListSearchInput
                      name="experiments"
                      label="Experiments"
                      searchFunction={(query, initialValue) =>
                        searchExperiments({
                          variables: { search: query, values: initialValue },
                        }).then((res) => res.data?.options || [])
                      }
                    />
                  </div>

                  <button type="submit">Change</button>
                </Form>
              )}
            </Formik>
          )}
        </div>

        <SectionTitle>Attached Images</SectionTitle>
        <ResponsiveGrid>
          {data?.sample?.representations?.filter(notEmpty).map((rep) => (
            <RepresentationCard
              rep={rep}
              key={rep.id}
              mates={[deleteRepresentationMate(rep)]}
            />
          ))}
        </ResponsiveGrid>
      </div>
    </PageLayout>
  );
};

export { Sample };
