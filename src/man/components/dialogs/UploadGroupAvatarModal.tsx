import { Dialog } from "@headlessui/react";
import { Form, Formik } from "formik";
import React from "react";
import { FileInputField } from "../../../components/forms/fields/file_input";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { SwitchInputField } from "../../../components/forms/fields/switch_input";
import { useModal } from "../../../components/modals/modal-context";
import {
  DetailGroupDocument,
  DetailGroupQuery,
  DetailGroupQueryVariables,
  UploadGroupAvatarMutationVariables,
  useUploadGroupAvatarMutation,
} from "../../api/graphql";
import { withMan } from "../../context";

export const UploadGroupAvatarModal: React.FC<{
  id: string;
}> = ({ id }) => {
  const { close } = useModal();

  const [uploadFile] = withMan(useUploadGroupAvatarMutation)({
    update(cache, result) {
      cache.updateQuery<DetailGroupQuery, DetailGroupQueryVariables>(
        {
          query: DetailGroupDocument,
          variables: {
            id: id,
          },
        },
        (existing) => {
          return existing?.group
            ? {
                ...existing,
                group: {
                  ...existing.group,
                  avatar: result.data?.uploadGroupAvatar?.image,
                },
              }
            : existing;
        }
      );
    },
  });

  return (
    <>
      <Formik<UploadGroupAvatarMutationVariables>
        initialValues={{
          file: undefined,
          group: id,
        }}
        validateOnBlur
        onSubmit={(values, { setSubmitting }) => {
          console.log("Variables", values);
          setSubmitting(true);
          uploadFile({ variables: values }).then((ex) => {
            close();
          });
        }}
      >
        {(formikProps) => (
          <Form>
            <div className="inline-block align-middle bg-white rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-2 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start w-full">
                  <div className="mt-1 test-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <Dialog.Title
                      as="h3"
                      className="text-xl mt-2 mb-4 leading-6 font-medium text-gray-900"
                    >
                      Upload Avatar
                    </Dialog.Title>
                    <div className="mt-2 align-left text-left ">
                      <FileInputField
                        name="file"
                        label="File"
                        description="The File you want to upload"
                      />
                    </div>
                    <div className="mt-2 align-left text-left ">
                      <SwitchInputField
                        name="primary"
                        label="Primary"
                        description="Should this be the primary avatar?"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 pb-2 sm:flex sm:flex-row-reverse">
                <SubmitButton className="mt-3 w-full inline-flex rounded-md border border-transparent shadow-sm px-4 py-2  bg-blue-600 text-base font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm">
                  {" "}
                  Upload File
                </SubmitButton>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 focus:outline-none hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => close()}
                >
                  Cancel
                </button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
};
