import { Form, Formik } from "formik";
import { useAlert } from "../../../components/alerter/alerter-context";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { Submit } from "../../../layout/dialog/DialogProvider";
import { TwDialog } from "../../../layout/dialog/TwDialog";
import {
  CreatePlotMutation,
  CreatePlotMutationVariables,
  MyDatasetsQuery,
  MyDatasetsDocument,
  useCreateDatasetMutation,
} from "../../api/graphql";
import { withMikro } from "../../MikroContext";

export const CreateDatasetModal = (props: Submit<CreatePlotMutation>) => {
  const [createDataset, data] = withMikro(useCreateDatasetMutation)({});

  const { alert } = useAlert();

  return (
    <Formik<CreatePlotMutationVariables>
      initialValues={{
        name: "",
      }}
      validateOnBlur
      onSubmit={async (values, { setSubmitting }) => {
        console.log(values);
        setSubmitting(true);
        try {
          let x = await createDataset({ variables: values });
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
            title="Create Dataset"
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
                A dataset is a collection of data within mikro, imagine it as a
                folder on your computer. You can have multiple datasets, and
                each dataset can have multiple datasets within
              </div>
              <TextInputField
                name="name"
                label="Name"
                description="The name of the dataset you want to create"
              />
            </div>
          </TwDialog>
        </Form>
      )}
    </Formik>
  );
};
