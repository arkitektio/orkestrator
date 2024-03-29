import { Form, Formik } from "formik";
import { useAlert } from "../../../components/alerter/alerter-context";
import { TwDialog } from "../../../components/dialog/TwDialog";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { Submit } from "../../../providers/dialog/DialogProvider";
import {
  CreateVanillaDiagramMutation,
  useCreateVanillaDiagramMutation,
} from "../../api/graphql";
import { withFluss } from "../../fluss";

export const CreateFlowDialog = ({
  submit,
  reject,
}: Submit<{ res: CreateVanillaDiagramMutation }>) => {
  const { alert } = useAlert();
  const [createGraph, data] = withFluss(useCreateVanillaDiagramMutation)({});

  return (
    <Formik<Partial<{ name: string; import: File }>>
      initialValues={{
        name: "test",
      }}
      onSubmit={async (values, { setSubmitting }) => {
        console.log(values);
        setSubmitting(true);
        let x = await createGraph({ variables: { ...values } });
        if (x.data) {
          submit({ res: x.data });
        }
      }}
    >
      {(formikProps) => (
        <Form>
          <TwDialog
            title="Create New Workspace"
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
                  Create Workspace
                </SubmitButton>
              </>
            }
          >
            <div className="mt-2 align-left text-left ">
              <TextInputField
                name="name"
                label="Name"
                description="How should your workflow be Called?"
              />
            </div>
          </TwDialog>
        </Form>
      )}
    </Formik>
  );
};
