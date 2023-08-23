import { Dialog } from "@headlessui/react";
import { Form, Formik } from "formik";
import React from "react";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { useModal } from "../../../components/modals/modal-context";
import { withLok } from "../../LokContext";
import {
  ChangeMeMutationVariables,
  MeUserFragment,
  ProfileDocument,
  ProfileQuery,
  useChangeMeMutation,
} from "../../api/graphql";

const ChangeMeModal: React.FC<{ me: MeUserFragment }> = ({ me }) => {
  const [changeMe] = withLok(useChangeMeMutation)({
    update(cache, result) {
      cache.updateQuery<ProfileQuery>(
        {
          query: ProfileDocument,
        },
        (existing) => {
          return existing?.me
            ? {
                ...existing,
                me: result.data?.changeMe,
              }
            : existing;
        }
      );
    },
  });
  const { close } = useModal();

  return (
    <>
      <Formik<ChangeMeMutationVariables>
        initialValues={me}
        validateOnBlur
        onSubmit={(values, { setSubmitting }) => {
          console.log(values);
          setSubmitting(true);
          changeMe({ variables: values }).then((res) => {
            close();
          });
        }}
      >
        {(formikProps) => (
          <Form>
            <div className="inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all mt-3 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-2 pb-4">
                <div className="p-3">
                  <div className="mt-1 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <Dialog.Title
                      as="h3"
                      className="text-xl mt-2 mb-4 leading-6 font-medium text-gray-900"
                    >
                      Create New App
                    </Dialog.Title>
                    <div className="mt-2 align-left text-left">
                      <TextInputField
                        name="firstName"
                        label="First Name"
                        description="Your first name"
                      />
                      <TextInputField
                        name="lastName"
                        label="Last Name"
                        description="Your last name"
                      />
                      <TextInputField
                        name="email"
                        label="Email"
                        description="Your email address"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 pb-2 sm:flex sm:flex-row-reverse">
                <SubmitButton className="mt-3 w-full inline-flex rounded-md border border-transparent shadow-sm px-4 py-2  bg-blue-600 text-base font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm">
                  {" "}
                  Change Me
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

export { ChangeMeModal };
