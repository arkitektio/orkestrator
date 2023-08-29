import { Form, Formik } from "formik";
import { TwDialog } from "../../../components/dialog/TwDialog";
import { GraphQLSearchInput } from "../../../components/forms/fields/SearchInput";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { Submit } from "../../../providers/dialog/DialogProvider";
import { withMikro } from "../../MikroContext";
import {
  CreateSampleMutationVariables,
  useCreateSampleMutation,
  useSearchExperimentsLazyQuery,
} from "../../api/graphql";

export const CreateSampleModal = ({
  name = "new",
  reject,
  submit,
  experiments,
}: Submit & Partial<CreateSampleMutationVariables>) => {
  const [search] = withMikro(useSearchExperimentsLazyQuery)();

  const [createSample, data] = withMikro(useCreateSampleMutation)();

  return (
    <Formik<CreateSampleMutationVariables>
      initialValues={{ name, experiments }}
      onSubmit={async (values, { setSubmitting }) => {
        console.log(values);
        setSubmitting(true);
        await createSample({ variables: values });
        submit(undefined);
      }}
    >
      {(formikProps) => (
        <Form>
          <TwDialog
            title="Create Dataset"
            buttons={
              <>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 focus:outline-none hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => reject()}
                >
                  Cancel
                </button>
                <SubmitButton className="mt-3 w-full inline-flex rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-800 disabled:opacity-30">
                  Submit
                </SubmitButton>
              </>
            }
          >
            <div className="mt-2 align-left text-left ">
              <TextInputField
                name="name"
                label="Name"
                description="The Name of the Sample"
              />
              <GraphQLSearchInput
                name={"experiments"}
                label="Experiments"
                searchFunction={search}
                description="Which Experiment does this belong to?"
              />
            </div>
          </TwDialog>
        </Form>
      )}
    </Formik>
  );
};
