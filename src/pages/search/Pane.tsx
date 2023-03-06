import { Transition } from "@headlessui/react";
import { Field, Form, Formik } from "formik";
import React, { useState, useEffect } from "react";
import { BiSearch } from "react-icons/bi";
import { FiArrowDown } from "react-icons/fi";
import { useSearchParams } from "react-router-dom";
import { ChangeSubmitHelper } from "../../rekuest/ui/helpers/ChangeSubmitter";
import { SearchSelectInput } from "../../components/forms/fields/search_select_input";
import { useUserOptionsLazyQuery } from "../../lok/api/graphql";
import { withMan } from "../../lok/man";
import {
  GlobalSearchQueryVariables,
  useGlobalSearchLazyQuery,
} from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/MikroContext";
import { DataSearch } from "../data/DataSearch";
import {
  ExperimentItem,
  RepresentationItem,
  SampleItem,
  TableItem,
} from "../data/DataSidebar";

export interface PaneProps {
  label: string;
  initialValues: GlobalSearchQueryVariables;
  onSubmit: (x: GlobalSearchQueryVariables) => void;
}

export const Search: React.FC<PaneProps> = (props) => {
  const [searchUser] = withMan(useUserOptionsLazyQuery)();

  const [expanded, setExpanded] = useState(false);

  return (
    <Formik<GlobalSearchQueryVariables>
      initialValues={props.initialValues}
      onSubmit={(values, { setSubmitting }) => {
        props.onSubmit(values);
        setSubmitting(false);
      }}
    >
      {(formik) => (
        <Form className="w-full p-3 rounded-md shadow-lg dark:bg-slate-200 dark:text-slate-800 flex flex-col">
          <ChangeSubmitHelper debounce={200} />
          <div className="flex flex-row">
            <div className="flex-grow transition-all">
              <Field
                name="search"
                placeholder={"Search"}
                className="w-full dark:bg-slate-200 focus:outline-none"
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
                  <div className="flex flex-row">
                    <div className="font-light my-auto mr-2">User</div>
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

export const Pane: React.FC<PaneProps> = (props) => {
  const [fetch, { data }] = withMikro(useGlobalSearchLazyQuery)();
  const [filter, setFilter] = React.useState<GlobalSearchQueryVariables>(
    props.initialValues
  );

  React.useEffect(() => {
    fetch({ variables: filter });
  }, [filter, fetch]);

  return (
    <>
      <DataSearch onFilterChanged={setFilter} />
      <div className="grid grid-cols-6 gap-2 p-5 overflow-y-scroll">
        {data?.experiments?.map((experiment, index) => (
          <ExperimentItem key={index} experiment={experiment} />
        ))}
        {data?.samples?.map((sa, index) => (
          <SampleItem key={index} sa={sa} />
        ))}
        {data?.tables?.map((ta, index) => (
          <TableItem table={ta} key={index} />
        ))}
        {data?.representations?.map((re, index) => (
          <RepresentationItem key={index} re={re} />
        ))}
      </div>
    </>
  );
};
