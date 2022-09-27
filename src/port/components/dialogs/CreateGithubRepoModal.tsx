import { Dialog } from "@headlessui/react";
import { Form, Formik } from "formik";
import React from "react";
import { useNavigate } from "react-router";
import { useAlert } from "../../../components/alerter/alerter-context";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { useModal } from "../../../components/modals/modal-context";
import {
  CreateGithubRepoMutationVariables,
  GithubReposDocument,
  useCreateGithubRepoMutation,
} from "../../api/graphql";
import { withPort } from "../../port";

export const CreateGithubRepoModal: React.FC = (props) => {
  const { close, show } = useModal();
  const [createWhale, data] = withPort(useCreateGithubRepoMutation)({
    update(cache, result) {
      const existing: any = cache.readQuery({
        query: GithubReposDocument,
      });
      cache.writeQuery({
        query: GithubReposDocument,
        data: {
          githubRepos: existing.githubRepos.concat(
            result.data?.createGithubRepo
          ),
        },
      });
    },
  });

  const { alert } = useAlert();

  return (
    <Formik<CreateGithubRepoMutationVariables>
      initialValues={{
        user: "",
        repo: "",
        branch: "main",
      }}
      onSubmit={async (values, { setSubmitting }) => {
        console.log(values);
        setSubmitting(true);
        try {
          await createWhale({ variables: values });
          close();
        } catch (e) {
          console.log(e);
          await alert({
            message: "Error",
            subtitle: (e as any).graphQLErrors
              .map((e: any) => e.message)
              .join(" "),
          });
        }
      }}
    >
      {(formikProps) => (
        <Form>
          <div className="inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="bg-white px-4 pt-2 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-1 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <Dialog.Title
                    as="h3"
                    className="text-xl mt-2 mb-4 leading-6 font-medium text-gray-900"
                  >
                    Create New Repo
                  </Dialog.Title>
                  <div className="mt-2 align-left text-left">
                    <div className="w-auto">
                      <img height="100" width="100" alt={"Github"} />
                    </div>
                    <TextInputField
                      name="user"
                      label="User"
                      description="The Image you want to clone as a Docker Container"
                    />
                    <TextInputField
                      name="repo"
                      label="Repository"
                      description="The Image you want to clone as a Docker Container"
                    />
                    <TextInputField
                      name="branch"
                      label="Branch"
                      description="The Image you want to clone as a Docker Container"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 pb-2 sm:flex sm:flex-row-reverse">
              <SubmitButton className="mt-3 w-full inline-flex rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-800 disabled:opacity-30">
                {" "}
                Scan Repo
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
  );
};
