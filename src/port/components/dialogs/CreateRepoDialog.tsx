import { Form, Formik } from "formik";
import { useAlert } from "../../../components/alerter/alerter-context";
import { TwDialog } from "../../../components/dialog/TwDialog";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { Submit } from "../../../providers/dialog/DialogProvider";
import { withPort } from "../../PortContext";
import {
  CreateGithubRepoMutation,
  CreateGithubRepoMutationVariables,
  useCreateGithubRepoMutation,
} from "../../api/graphql";
import github from "./github.png";

type Overrides = Partial<CreateGithubRepoMutationVariables>;

export const CreateRepoDialog = (
  props: Submit<CreateGithubRepoMutation> & Overrides
) => {
  const [createRepo, data] = withPort(useCreateGithubRepoMutation)({
    refetchQueries: ["GithubRepos"],
  });

  const { alert } = useAlert();

  return (
    <Formik<CreateGithubRepoMutationVariables>
      initialValues={{
        user: "",
        repo: "",
        branch: "main",
        ...props,
      }}
      onSubmit={async (values, { setSubmitting }) => {
        console.log(values);
        setSubmitting(true);
        try {
          let x = await createRepo({ variables: values });
          if (x.data) {
            props.submit(x.data);
          }
        } catch (e) {
          console.log(e);
          await alert({
            message: "Error",
            subtitle: (e as any).graphQLErrors
              .map((e: any) => e.message)
              .join(" "),
          });
          props.reject();
        }
      }}
    >
      {(formikProps) => (
        <Form>
          <TwDialog
            title="Scan Github Repo"
            buttons={
              <>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 focus:outline-none hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => props.reject()}
                >
                  Cancel
                </button>
                <SubmitButton className="mt-3 w-full inline-flex rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-800 disabled:opacity-30">
                  Submit
                </SubmitButton>
              </>
            }
          >
            <div className="mt-2 align-left text-left">
              <div className="w-auto">
                <img height="100" width="100%" alt={"Github"} src={github} />
              </div>
              <div className="mt-2 text-sm mb-3">
                When you scan a Github repo, we will scan all the files in the
                repo and check for arkitekt enabled software. This repo can then
                be used to create arkitekt applications.
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
          </TwDialog>
        </Form>
      )}
    </Formik>
  );
};
