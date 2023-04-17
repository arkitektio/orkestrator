import { Dialog } from "@headlessui/react";
import { Form, Formik } from "formik";
import { useNavigate } from "react-router";
import { useAlert } from "../../../components/alerter/alerter-context";
import { GraphQLListSearchInput } from "../../../components/forms/fields/SearchInput";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { implementValidationSchema } from "../../../components/forms/implement/schema";
import { modalfy } from "../../../layout/Modal";
import { Workspace } from "../../../linker";
import { withRekuest } from "../../../rekuest";
import { useRegistryOptionsLazyQuery } from "../../../rekuest/api/graphql";
import {
  CreateVanillaDiagramMutationVariables,
  useCreateVanillaDiagramMutation,
} from "../../api/graphql";
import { withFluss } from "../../fluss";

export type ImplementInput = {
  name: string;
  engine: string;
  version: string;
};

export interface NodeEngine {
  logo: string;
  engine: string;
  description: string;
  allowed_nodes: [string];
}

export const CreateFlowModal = modalfy(({ setShow, show }) => {
  const [createGraph, data] = withFluss(useCreateVanillaDiagramMutation)({
    update(cache, result) {
      // const existing: any = cache.readQuery({
      //   query: MyDiagramsDocument,
      // });
      // cache.writeQuery({
      //   query: MyDiagramsDocument,
      //   data: {
      //     mydiagrams: existing.mydiagrams.concat(result.data?.drawvanilla),
      //   },
      // });
    },
  });

  const [searchRestrict] = withRekuest(useRegistryOptionsLazyQuery)();
  const { alert } = useAlert();

  const navigate = useNavigate();

  return (
    <Formik<CreateVanillaDiagramMutationVariables>
      initialValues={{
        name: "",
        restrict: [],
      }}
      validateOnBlur
      validateOnChange
      validationSchema={implementValidationSchema}
      onSubmit={(values, { setSubmitting }) => {
        console.log(values);
        setSubmitting(true);
        createGraph({ variables: { ...values } }).then((graph) => {
          let test = graph.data?.drawvanilla?.id;
          if (test) {
            navigate(Workspace.linkBuilder(test));
          }
        });
      }}
    >
      {(formikProps) => (
        <Form>
          <div className="inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="bg-white px-4 pt-2 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-1 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <Dialog.Title
                    as="h3"
                    className="text-xl mt-2 mb-4 leading-6 font-medium text-gray-900"
                  >
                    Create New Workspace
                  </Dialog.Title>
                  <div className="mt-2  w-full">
                    <TextInputField
                      name="name"
                      label="Name"
                      description="How should your workflow be Called?"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 pb-2 sm:flex sm:flex-row-reverse">
              <SubmitButton className="mt-3 w-full inline-flex rounded-md border border-transparent shadow-sm px-4 py-2  bg-blue-600 text-base font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm">
                {" "}
                Create Workspace
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
});
