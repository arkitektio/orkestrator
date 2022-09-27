import { Dialog } from "@headlessui/react";
import { Form, Formik } from "formik";
import React from "react";
import { ParagraphInputField } from "../../../components/forms/fields/paragraph_input";
import { SubmitButton } from "../../../components/forms/fields/SubmitButton";
import { TextInputField } from "../../../components/forms/fields/text_input";
import { useModal } from "../../../components/modals/modal-context";
import { StreamItem, StreamItemInput } from "../../../fluss/api/graphql";

interface Props {
  arg: StreamItem;
  onArgAltered: (selector: StreamItemInput) => void;
}

const possibleWidgetTypes = {
  StructureArgPort: [{ value: "SearchWidget", label: "Search" }],
  BoolArgPort: [{ value: "BoolWidget", label: "Switch" }],
  ListArgPort: [
    { value: "SearchWidget", label: "Search" },
    { value: "IntWidget", label: "Enter IDs" },
  ],
  IntArgPort: [
    { value: "IntWidget", label: "Integer Input" },
    { value: "SliderWidget", label: "Slider" },
  ],
  StringArgPort: [{ value: "StringWidget", label: "Searchable Query Widget" }],
  EnumArgPort: [{ value: "EnumArgPort", label: "Enter Options" }],
  DictArgPort: [{ value: "JSONWidget", label: "JSON" }],
};

export const AlterArgModal: React.FC<Props> = (props: Props) => {
  const { close, show } = useModal();

  return (
    <div>
      <Formik<StreamItemInput>
        initialValues={props.arg}
        onSubmit={(formvalues) => {
          props.onArgAltered({ ...formvalues });
          close();
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
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 pb-2 sm:flex sm:flex-row-reverse">
                <SubmitButton className="mt-3 w-full inline-flex rounded-md border border-transparent shadow-sm px-4 py-2  bg-blue-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm">
                  {" "}
                  Alter Argument
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
