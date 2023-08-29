import { Form, Formik } from "formik";
import { TwDialog } from "../../../components/dialog/TwDialog";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { FileInputField } from "../../../components/forms/fields/file_input";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { Submit } from "../../../providers/dialog/DialogProvider";
import { withLok } from "../../LokContext";
import {
  DetailGroupFragment,
  UpdateGroupMutation,
  UpdateGroupMutationVariables,
  useUpdateGroupMutation,
} from "../../api/graphql";

export const ChangeGroupDialog = (
  props: Submit<UpdateGroupMutation> & { group: DetailGroupFragment }
) => {
  const [updateGroup] = withLok(useUpdateGroupMutation)({
    update: (cache, { data }) => {
      if (data?.updateGroup) {
        cache.modify({
          id: cache.identify(data.updateGroup),
          fields: {
            profile: () => data.updateGroup?.profile,
          },
        });
      }
    },
  });

  return (
    <Formik<UpdateGroupMutationVariables>
      initialValues={{
        ...props.group,
      }}
      onSubmit={async (values) => {
        console.log("submit", values);
        const res = await updateGroup({
          variables: values,
        });

        if (res.data?.updateGroup) {
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
            <div className="font-light text-sm mb-2">Update this group</div>
            <TextInputField
              name="name"
              label="Name"
              placeholder="Create a cleartext name for this group"
            />
            <FileInputField
              name="avatar"
              label="Avatar"
              description="The avatar of this user"
            />
          </span>
        </TwDialog>
      </Form>
    </Formik>
  );
};
