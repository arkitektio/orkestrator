import { Dialog } from "@headlessui/react";
import { Form, Formik } from "formik";
import { SelectInputField } from "../../../components/forms/fields/select_input";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { modalfy } from "../../../layout/Modal";
import {
  CreatePlotMutationVariables,
  CreateSampleMutationVariables,
  useCreatePlotMutation,
  useCreateSampleMutation,
  useMyExperimentsQuery,
} from "../../api/graphql";
import { withMikro } from "../../mikro-types";

export const CreatePlotModal = modalfy(
  ({
    setShow,
  }: {
    experiments?: [string];
    show: boolean;
    setShow: (show: boolean) => void;
  }) => {
    const [createPlot, data] = withMikro(useCreatePlotMutation)();

    return (
      <Formik<CreatePlotMutationVariables>
        initialValues={{
          name: "",
        }}
        validateOnBlur
        onSubmit={(values, { setSubmitting }) => {
          console.log(values);
          setSubmitting(true);
          createPlot({ variables: values }).then((ex) => {
            console.log(ex);
            setShow(false);
          });
        }}
      >
        {(formikProps) => (
          <Form>
            <div className="inline-block align-middle bg-white rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-2 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start w-full">
                  <div className="mt-1 test-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <Dialog.Title
                      as="h3"
                      className="text-xl mt-2 mb-4 leading-6 font-medium text-gray-900"
                    >
                      Create New Plot
                    </Dialog.Title>
                    <div className="mt-2 align-left text-left ">
                      <TextInputField
                        name="name"
                        label="Name"
                        description="The Name of the Sample"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 pb-2 sm:flex sm:flex-row-reverse">
                <SubmitButton className="mt-3 w-full inline-flex rounded-md border border-transparent shadow-sm px-4 py-2  bg-blue-600 text-base font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm">
                  {" "}
                  Create Plot
                </SubmitButton>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 focus:outline-none hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShow(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    );
  }
);
