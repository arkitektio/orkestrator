import { Form, Formik } from "formik";
import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { CreateableSearchSelect } from "../../components/forms/fields/search_select_input";
import { TextInputField } from "../../components/forms/fields/text_input";
import { SectionTitle } from "../../layout/SectionTitle";
import {
  UpdateOmeroFileMutationVariables,
  useDetailOmeroFileQuery,
  useTagSearchLazyQuery,
  useUpdateOmeroFileMutation,
} from "../api/graphql";
import { useMikro, withMikro } from "../mikro-types";

export type ISampleProps = {
  id: string;
};

const File: React.FC<ISampleProps> = ({ id }) => {
  const { data } = withMikro(useDetailOmeroFileQuery)({
    variables: { id: id },
  });

  const [show, setshow] = useState(false);

  const [searchTags, _t] = withMikro(useTagSearchLazyQuery)();

  const [updateOmero, _] = withMikro(useUpdateOmeroFileMutation)();

  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const { s3resolve } = useMikro();

  return (
    <div className="p-5">
      <SectionTitle>{data?.omerofile?.name}</SectionTitle>

      <div className="flex flex-col bg-white p-3 rounded rounded-md mt-2 mb-2">
        <div className="font-light">Tags</div>
        <div className="text-xl flex mb-2">
          {data?.omerofile?.tags?.map((tag, index) => (
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
        {data?.omerofile && show && (
          <Formik<UpdateOmeroFileMutationVariables>
            initialValues={{
              id: data?.omerofile?.id,
              tags: data?.omerofile?.tags,
            }}
            onSubmit={(values) => {
              updateOmero({ variables: values })
                .then(console.log)
                .then(() => setshow(false));
            }}
          >
            {() => (
              <Form>
                <TextInputField name="name" label="Name" />
                <div className="flex-grow">
                  <CreateableSearchSelect
                    name="tags"
                    isMulti={true}
                    label="Tags"
                    lazySearch={searchTags}
                  />
                </div>

                <button type="submit">Change</button>
              </Form>
            )}
          </Formik>
        )}
      </div>
    </div>
  );
};

export { File };
