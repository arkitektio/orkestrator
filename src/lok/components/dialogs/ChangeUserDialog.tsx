import { Form, Formik } from "formik";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { FileInputField } from "../../../components/forms/fields/file_input";
import { SwitchInputField } from "../../../components/forms/fields/switch_input";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { Submit } from "../../../layout/dialog/DialogProvider";
import { TwDialog } from "../../../layout/dialog/TwDialog";
import { withLok } from "../../LokContext";
import {
  DetailUserFragment,
  UpdateUserMutation,
  UpdateUserMutationVariables,
  useUpdateUserMutation,
} from "../../api/graphql";

export const ChangeUserDialog = (
  props: Submit<UpdateUserMutation> & { user: DetailUserFragment }
) => {
  const [updateUser] = withLok(useUpdateUserMutation)({
    update: (cache, { data }) => {
      if (data?.updateUser) {
        cache.modify({
          id: cache.identify(data.updateUser),
          fields: {
            email: () => data.updateUser?.email,
            firstName: () => data.updateUser?.firstName,
            lastName: () => data.updateUser?.lastName,
            profile: () => data.updateUser?.profile,
          },
        });
      }
    },
  });

  return (
    <Formik<UpdateUserMutationVariables>
      initialValues={{
        ...props.user,
      }}
      onSubmit={async (values) => {
        console.log("submit", values);
        const res = await updateUser({
          variables: values,
        });

        if (res.data?.updateUser) {
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
            <div className="font-light text-sm mb-2">
              This repo would like to create an App on your behalf
            </div>
            <TextInputField
              name="firstName"
              label="First Name"
              placeholder=" First Name"
              description="The first name of this user"
            />
            <TextInputField
              name="lastName"
              label="Last Name"
              placeholder=" Last Name"
              description="The last name of this user"
            />
            <TextInputField
              name="email"
              label="Email"
              description="The email of this user"
            />
            <FileInputField
              name="avatar"
              label="Avatar"
              description="The avatar of this user"
            />
            <SwitchInputField
              name="active"
              label="Active"
              description="Can this user login"
              falseDescription="This user cannot login"
            />
          </span>
        </TwDialog>
      </Form>
    </Formik>
  );
};
