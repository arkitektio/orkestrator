import { Dialog } from "@headlessui/react";
import { Form, Formik } from "formik";
import React from "react";
import {
  useArgPortTypesQuery,
  useStructureOptionsQuery,
} from "../../../rekuest/api/graphql";
import { ParagraphInputField } from "../../../components/forms/fields/paragraph_input";
import { SelectInputField } from "../../../components/forms/fields/select_input";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { useModal } from "../../../components/modals/modal-context";
import { withRekuest } from "../../../rekuest";

export interface ArgValues {
  key: string;
  label: any;
  identifier?: string;
  __typename: string;
  description: string;
}
interface Props {
  onArgCreated: (selector: ArgValues) => void;
}

export const ArgModal: React.FC<Props> = (props: Props) => {
  const { close, show } = useModal();

  const { data } = withRekuest(useArgPortTypesQuery)();
  const { data: structures } = withRekuest(useStructureOptionsQuery)();

  return (
    <div>
      <Formik<ArgValues>
        initialValues={{
          key: "",
          label: "",
          description: "",
          __typename: "IntInPort",
        }}
        onSubmit={(formvalues) => {
          props.onArgCreated({ ...formvalues });
        }}
      >
        {(formik) => (
          <Form autoComplete={"off"}>
            <div className="inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-2 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-1 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <Dialog.Title
                      as="h3"
                      className="text-xl mt-2 mb-2 leading-6 text-center font-medium text-gray-900"
                    >
                      Create an Argument
                    </Dialog.Title>
                    <div className="mt-4 text-left w-100">
                      <TextInputField name="key" label="Specify a Key" />
                      <TextInputField name="label" label="Specify a Label" />
                      <ParagraphInputField
                        name="description"
                        label="Describe the inputs"
                      />
                      {data?.args?.possibleTypes && (
                        <SelectInputField
                          name="__typename"
                          label="What Type of Port"
                          options={data?.args?.possibleTypes}
                        />
                      )}
                      {formik.values.__typename == "StructureArgPort" &&
                        structures?.options && (
                          <SelectInputField
                            name={"identifier"}
                            label="The identifier"
                            options={structures?.options}
                          />
                        )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 pb-2 sm:flex sm:flex-row-reverse">
                <SubmitButton className="mt-3 w-full inline-flex rounded-md border border-transparent shadow-sm px-4 py-2  bg-blue-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm">
                  {" "}
                  Create Arg
                </SubmitButton>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => close()}
                >
                  Cancel
                </button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};
