import { Transition } from "@headlessui/react";
import { Field, Form, Formik } from "formik";
import { useState } from "react";
import { BiSearch } from "react-icons/bi";
import { FiArrowDown } from "react-icons/fi";
import { GraphQLListSearchInput } from "../../../components/forms/fields/SearchInput";
import { withLok } from "../../../lok/LokContext";
import { useUserOptionsLazyQuery } from "../../../lok/api/graphql";
import { withRekuest } from "../../RekuestContext";
import {
  NodesQueryVariables,
  useSearchCollectionsLazyQuery,
} from "../../api/graphql";
import { ChangeSubmitHelper } from "../../ui/helpers/ChangeSubmitter";

interface NodeFilterBoxProps {
  onFilterChanged: (values: NodesQueryVariables) => any;
  className?: string;
  placeholder?: string;
}

export const NodeSearchFilter: React.FC<NodeFilterBoxProps> = ({
  onFilterChanged,
  className,
  placeholder,
}) => {
  const [searchUser] = withLok(useUserOptionsLazyQuery)();
  const [searchCollection] = withRekuest(useSearchCollectionsLazyQuery)();
  const [expanded, setExpanded] = useState(false);

  return (
    <Formik<NodesQueryVariables>
      initialValues={{
        search: "",
      }}
      onSubmit={(values, { setSubmitting }) => {
        console.log(values);
        onFilterChanged(values);
        setSubmitting(false);
      }}
    >
      {(formik) => (
        <Form className="w-full p-3 rounded-md shadow-md bg-slate-100 text-slate-900 dark:border-none border-gray-300 border flex flex-col">
          <ChangeSubmitHelper debounce={200} />
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
                    <GraphQLListSearchInput
                      name="collections"
                      searchFunction={searchCollection}
                      label="Collections"
                    />
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
