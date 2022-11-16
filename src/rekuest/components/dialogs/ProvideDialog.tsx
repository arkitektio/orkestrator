import { Form, Formik } from "formik";
import { SearchSelectInput } from "../../../components/forms/fields/search_select_input";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { Submit } from "../../../layout/dialog/DialogProvider";
import { TwDialog } from "../../../layout/dialog/TwDialog";
import {
  DetailTemplateFragment,
  ProvideMutation,
  ProvideMutationVariables,
  useAgentOptionsLazyQuery,
  useProvideMutation,
} from "../../api/graphql";
import { withRekuest } from "../../RekuestContext";

export type IMyWhalesProps = {};

export const ProvideDialog = (
  props: Submit<ProvideMutation> & { template: DetailTemplateFragment }
) => {
  const [provide] = withRekuest(useProvideMutation)();
  const [searchAgents] = withRekuest(useAgentOptionsLazyQuery)({
    variables: { registry: props.template.registry.id },
  });

  return (
    <Formik<ProvideMutationVariables>
      initialValues={{ template: props.template.id, agent: "" }}
      onSubmit={async (values) => {
        console.log("submit", values);
        const res = await provide({
          variables: values,
        });

        if (res.data?.provide) {
          props.submit(res.data);
          return;
        }
        props.reject();
      }}
    >
      <Form>
        <TwDialog
          title="Create App"
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
          <span className="font-light text-xl text-black">
            <div className="font-light text-sm mb-2">
              This repo would like to create an App on your behalf
            </div>

            <SearchSelectInput
              name="agent"
              label="Instance"
              lazySearch={searchAgents}
              description="This template can be hosted on different instances of the app. Chose the one you want to use."
            />
          </span>
        </TwDialog>
      </Form>
    </Formik>
  );
};
