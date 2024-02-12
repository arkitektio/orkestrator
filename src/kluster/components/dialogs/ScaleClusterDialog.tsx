import { Form, Formik } from "formik";
import { useAlert } from "../../../components/alerter/alerter-context";
import { TwDialog } from "../../../components/dialog/TwDialog";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { Submit } from "../../../providers/dialog/DialogProvider";

import { withKluster } from "@jhnnsrs/kluster";
import { SliderInputField } from "../../../components/forms/fields/slide_input";
import { ScaleDaskClusterMutation, ScaleDaskClusterMutationVariables, useScaleDaskClusterMutation } from "../../api/graphql";

export const ScaleClusterDialog = ({
  id,
  submit,
  reject,
}: Submit<{ res: ScaleDaskClusterMutation }> & {id: string}) => {
  const { alert } = useAlert();
  const [scale, data] = withKluster(useScaleDaskClusterMutation)({
    refetchQueries: ["Clusters"],
  });

  return (
    <Formik<ScaleDaskClusterMutationVariables>
      initialValues={{
        id: id,
        n: 2,
      }}
      onSubmit={async (values, { setSubmitting }) => {
        let x = await scale({ variables: values});
        console.log(x)
        if (x.data) {
          submit({ res: x.data });
        }
      }}
    >
      {(formikProps) => (
        <Form>
          <TwDialog
            title="Create New Project"
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
                  Scale
                </SubmitButton>
              </>
            }
          >
            <div className="mt-2 align-left text-left ">
              <SliderInputField
                min={0}
                max={40}
                name="n"
                label="How Many Workers?"
                description="How many workers do you want to add to the cluster?"
              />
            </div>
          </TwDialog>
        </Form>
      )}
    </Formik>
  );
};
