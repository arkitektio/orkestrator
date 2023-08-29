import { Form, Formik } from "formik";
import { useAlert } from "../../../components/alerter/alerter-context";
import { TwDialog } from "../../../components/dialog/TwDialog";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { FileInputField } from "../../../components/forms/fields/file_input";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { Submit } from "../../../providers/dialog/DialogProvider";
import { ImportFlowMutation, useImportFlowMutation } from "../../api/graphql";
import { withFluss } from "../../fluss";

export const ImportFlowDialog = ({
  submit,
  reject,
}: Submit<{ res: ImportFlowMutation }>) => {
  const { alert } = useAlert();
  const [importFlow] = withFluss(useImportFlowMutation)();

  return (
    <Formik<Partial<{ name: string; import: File }>>
      initialValues={{
        name: "test",
      }}
      onSubmit={async (values, { setSubmitting }) => {
        console.log(values);
        setSubmitting(true);

        if (values.import) {
          var reader = new FileReader();
          reader.readAsText(values.import, "UTF-8");

          reader.onload = (readerEvent) => {
            var content = readerEvent?.target?.result; // this is the content!

            let x = JSON.parse(content as string);
            importFlow({
              variables: {
                name: values.name,
                graph: x,
              },
            }).then((x) => {
              x.data && submit({ res: x.data });
            });
          };
        }
      }}
    >
      {(formikProps) => (
        <Form>
          <TwDialog
            title="Import Flow"
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
              <FileInputField name="import" label="x" description="Label" />
            </div>
          </TwDialog>
        </Form>
      )}
    </Formik>
  );
};
