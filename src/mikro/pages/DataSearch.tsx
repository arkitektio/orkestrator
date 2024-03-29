import { Transition } from "@headlessui/react";
import { Field, Form, Formik } from "formik";
import { useState } from "react";
import { BiSearch } from "react-icons/bi";
import { FiArrowDown } from "react-icons/fi";
import {
  GlobalSearchQueryVariables,
  useStageSearchLazyQuery,
  useTagSearchLazyQuery,
  useUserOptionsLazyQuery,
} from "../../mikro/api/graphql";
import { ChangeSubmitHelper } from "../../rekuest/ui/helpers/ChangeSubmitter";

import "react-datepicker/dist/react-datepicker.css";
import {
  GraphQLListSearchInput,
  GraphQLSearchInput,
} from "../../components/forms/fields/SearchInput";
import { DateInputField } from "../../components/forms/fields/date_input";
import { SwitchInputField } from "../../components/forms/fields/switch_input";
import { withMikro } from "../../mikro/MikroContext";

interface NodeFilterBoxProps {
  onFilterChanged: (values: GlobalSearchQueryVariables) => any;
  className?: string;
  placeholder?: string;
}

export const DataSearch: React.FC<NodeFilterBoxProps> = ({
  onFilterChanged,
  className,
  placeholder,
}) => {
  const [searchUser] = withMikro(useUserOptionsLazyQuery)();
  const [searchTags] = withMikro(useTagSearchLazyQuery)();
  const [searchStages] = withMikro(useStageSearchLazyQuery)();
  const [expanded, setExpanded] = useState(false);

  return (
    <Formik<GlobalSearchQueryVariables>
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
                    <GraphQLSearchInput
                      name="creator"
                      searchFunction={searchUser}
                      label="Created by"
                    />
                    <GraphQLListSearchInput
                      name="tags"
                      label="Has tags"
                      searchFunction={searchTags}
                    />
                    <GraphQLListSearchInput
                      name="stages"
                      label="In stages"
                      accepts={["list:@mikro/stage", "item:@mikro/stage"]}
                      searchFunction={searchStages}
                    />
                    <DateInputField
                      name="createdBefore"
                      label="Created before"
                    />
                    <DateInputField name="createdAfter" label="Created after" />
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
