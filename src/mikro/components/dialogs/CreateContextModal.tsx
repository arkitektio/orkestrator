import { Form, Formik } from "formik";
import { useAlert } from "../../../components/alerter/alerter-context";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { Submit } from "../../../layout/dialog/DialogProvider";
import { TwDialog } from "../../../layout/dialog/TwDialog";
import {
  CreateContextMutation,
  CreateContextMutationVariables,
  MyContextsDocument,
  MyContextsQuery,
  useCreateContextMutation,
} from "../../api/graphql";
import { withMikro } from "../../MikroContext";

type Overrides = Partial<CreateContextMutationVariables>;

export const CreateContextModal = (
  props: Submit<CreateContextMutation> & Overrides
) => {
  const [createRepo, data] = withMikro(useCreateContextMutation)({
    update(cache, result) {
      const existing = cache.readQuery<MyContextsQuery>({
        query: MyContextsDocument,
      });
      cache.writeQuery({
        query: MyContextsDocument,
        data: {
          mycontexts: existing?.mycontexts?.concat(result.data?.createContext),
        },
      });
    },
  });

  const { alert } = useAlert();

  return (
    <Formik<CreateContextMutationVariables>
      initialValues={{
        name: "",
      }}
      onSubmit={async (values, { setSubmitting }) => {
        console.log(values);
        setSubmitting(true);
        try {
          let x = await createRepo({ variables: values });
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
                  Submit
                </SubmitButton>
              </>
            }
          >
            <div className="mt-2 align-left text-left">
              <div className="mt-2 text-sm mb-3">
                When you create a context you can define specific rule for
                linkage between data items within mikro (e.g a context for a
                specific deep learning project where you map relations within a
                ground truth dataset and the)
              </div>
              <TextInputField
                name="name"
                label="Name"
                description="The name of the context you want to create"
              />
            </div>
          </TwDialog>
        </Form>
      )}
    </Formik>
  );
};
