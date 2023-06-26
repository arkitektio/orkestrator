import { Form, Formik } from "formik";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { Submit } from "../../../layout/dialog/DialogProvider";
import { TwDialog } from "../../../layout/dialog/TwDialog";
import { RunWhaleMutationVariables } from "../../api/graphql";

export type IMyWhalesProps = {};

export const RunWhaleDialog = (
  props: Submit<RunWhaleMutationVariables> & { whale: string }
) => {
  return (
    <Formik<RunWhaleMutationVariables>
      initialValues={{
        id: props.whale,
        instance: "main",
      }}
      onSubmit={async (values, { setSubmitting }) => {
        props.submit(values);
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
                  Deploy
                </SubmitButton>
              </>
            }
          >
            <div className="mt-2 align-left text-left">
              <div className="w-auto"></div>
              <TextInputField
                name="instance"
                label="Instance"
                description="The instance of the whale you want to run"
              />
            </div>
          </TwDialog>
        </Form>
      )}
    </Formik>
  );
};
