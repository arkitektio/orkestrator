import { Form, Formik } from "formik";
import { FileInputField } from "../../../components/forms/fields/file_input";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { Submit } from "../../../layout/dialog/DialogProvider";
import { TwDialog } from "../../../layout/dialog/TwDialog";
import {
  DetailAppFragment,
  UpdateAppMutation,
  UpdateAppMutationVariables,
  UpdateGroupMutation,
  UpdateGroupMutationVariables,
  useUpdateAppMutation,
  useUpdateGroupMutation,
} from "../../api/graphql";
import { withMan } from "../../man";

export const ChangeAppDialog = (
  props: Submit<UpdateAppMutation> & { app: DetailAppFragment }
) => {
  const [updateApp] = withMan(useUpdateAppMutation)({
    update: (cache, { data }) => {
      if (data?.updateApp) {
        cache.modify({
          id: cache.identify(data.updateApp),
          fields: {
            logo: () => data.updateApp?.logo,
          },
        });
      }
    },
  });

  return (
    <Formik<UpdateAppMutationVariables>
      initialValues={{
        ...props.app,
        logo: undefined,
      }}
      onSubmit={async (values) => {
        console.log("submit", values);
        const res = await updateApp({
          variables: values,
        });

        if (res.data?.updateApp) {
          props.submit(res.data);
          return;
        }
        props.reject();
      }}
    >
      <Form>
        <TwDialog
          title="Update User"
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
            <div className="font-light text-sm mb-2">Update this app</div>
            <FileInputField
              name="logo"
              label="Logo"
              description="The logo of this application"
            />
          </span>
        </TwDialog>
      </Form>
    </Formik>
  );
};
