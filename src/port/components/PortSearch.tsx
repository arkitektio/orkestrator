import { Transition } from "@headlessui/react";
import { Field, Form, Formik } from "formik";
import React, { useState } from "react";
import { BiSearch } from "react-icons/bi";
import { FiArrowDown } from "react-icons/fi";
import { SwitchInputField } from "../../components/forms/fields/switch_input";
import { ChangeSubmitHelper } from "../../rekuest/ui/helpers/ChangeSubmitter";
import { PortGlobalSearchQueryVariables } from "../api/graphql";

interface PortSearchProps {
  onSearch: (variables: PortGlobalSearchQueryVariables) => void;
  placeholder?: string;
}

export const PortSearch = ({ onSearch, placeholder }: PortSearchProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Formik<PortGlobalSearchQueryVariables>
      initialValues={{
        search: "",
      }}
      onSubmit={(values, { setSubmitting }) => {
        console.log(values);
        onSearch(values);
        setSubmitting(false);
      }}
    >
      {(formik) => (
        <Form className="w-full p-3 rounded-md shadow-md bg-slate-100 text-slate-900 dark:border-none border-gray-300 border flex flex-col">
          <ChangeSubmitHelper debounce={200}  />
          <div className="flex flex-row">
            <div className="flex-grow transition-all">
              <Field
                name="search"
                placeholder={placeholder || "Search"}
                className="w-full focus:outline-none"
              />
            </div>
            {formik.dirty ? (
              <FiArrowDown
                className="my-auto cursor-pointer "
                onClick={() => setExpanded(!expanded)}
              />
            ) : (
              <BiSearch
                className="my-auto cursor-pointer"
                onClick={() => setExpanded(!expanded)}
              />
            )}
          </div>
          <div>
            <Transition
              show={expanded}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <>
                <div className="grid grid-cols-1 mt-2 dark:border-t-slate-800">
                  <div className="flex flex-col">
                    <SwitchInputField name="pinned" label="Pinned" />
                  </div>
                </div>
              </>
            </Transition>
          </div>
        </Form>
      )}
    </Formik>
  );
};
