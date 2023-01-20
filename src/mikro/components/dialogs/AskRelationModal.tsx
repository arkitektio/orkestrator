import { Form, Formik } from "formik";
import { useAlert } from "../../../components/alerter/alerter-context";
import { SearchSelectInput } from "../../../components/forms/fields/search_select_input";
import { SelectInputField } from "../../../components/forms/fields/select_input";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { Submit } from "../../../layout/dialog/DialogProvider";
import { TwDialog } from "../../../layout/dialog/TwDialog";
import {
  CreateContextMutation,
  CreateContextMutationVariables,
  MyContextsDocument,
  MyContextsQuery,
  useCreateContextMutation,
  useSearchContextsLazyQuery,
} from "../../api/graphql";
import { withMikro } from "../../MikroContext";

type Variables = { context: string; relation: string };

export const AskRelationModal = (props: Submit<Variables>) => {
  const { alert } = useAlert();

  const [searchContexts] = withMikro(useSearchContextsLazyQuery)();

  return (
    <Formik<Variables>
      initialValues={{
        context: "",
        relation: "",
      }}
      onSubmit={async (values, { setSubmitting }) => {
        console.log(values);
        setSubmitting(true);
        try {
          props.submit(values);
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
              <div className="mt-2 text-sm mb-3">
                When you create a relationship between two contexts, you can
              </div>
              <TextInputField
                name="relation"
                label="Name"
                description="The name of the context you want to create"
              />
              <SearchSelectInput
                name="context"
                label="Context"
                lazySearch={searchContexts}
                description="The context you want to create a relation for"
              />
            </div>
          </TwDialog>
        </Form>
      )}
    </Formik>
  );
};
