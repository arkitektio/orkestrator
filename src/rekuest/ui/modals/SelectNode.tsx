import { Dialog } from "@headlessui/react";
import { Field, Form, Formik, FormikHelpers } from "formik";
import { Maybe } from "graphql/jsutils/Maybe";
import React from "react";
import { useModal } from "../../../components/modals/modal-context";
import { NodeListItemFragment, useNodesQuery } from "../../api/graphql";
import { withRekuest } from "../../RekuestContext";
import { ChangeSubmitHelper } from "../helpers/ChangeSubmitter";

interface NodeListProps {
  nodes: Maybe<NodeListItemFragment>[];
  onNodeSelected?: (node: Maybe<NodeListItemFragment>) => any;
}

export const NodeList: React.FC<NodeListProps> = ({
  nodes,
  onNodeSelected,
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 text-gray-800 w-full">
      {nodes?.map((node) => (
        <div
          key={node?.id}
          className="rounded w-full overflow-hidden p-2 shadow-md bg-white hover:text-white hover:bg-gray-800 cursor-pointer"
          onClick={() => {
            console.log("n");
            onNodeSelected && onNodeSelected(node);
          }}
        >
          <div className="p-1 ">
            <div className="font-light text-md mb-1">{node?.name}</div>
            <p className="text-xs">{node?.description}</p>
          </div>
          <div className="p-1 text-xs">
            @{node?.package}/{node?.interface}
          </div>
        </div>
      ))}
    </div>
  );
};

interface NodeFilterBoxProps {
  onFilterChanged: (values: NodeFilterValues) => any;
}

interface NodeFilterValues {
  search: string;
}

export const NodeFilterBox: React.FC<NodeFilterBoxProps> = ({
  onFilterChanged,
}) => {
  return (
    <Formik
      initialValues={{
        search: "",
      }}
      onSubmit={(
        values: NodeFilterValues,
        { setSubmitting }: FormikHelpers<NodeFilterValues>
      ) => {
        console.log(values);
        onFilterChanged(values);
        setSubmitting(false);
      }}
    >
      {(formik) => (
        <Form>
          <ChangeSubmitHelper debounce={500} formik={formik} />
          <div className="flex flex-wrap items-stretch w-full mb-4 relative">
            <div className="flex -mr-px">
              <span className="flex items-center leading-normal bg-grey-lighter rounded-r-none border border-r-0 border-grey-light px-3 whitespace-no-wrap text-grey-dark text-sm">
                Search
              </span>
            </div>
            <Field
              className="flex-shrink flex-grow flex-auto leading-normal w-px flex-1 border h-10 border-grey-light rounded-l-none px-3 relative focus:border-blue focus:shadow"
              name="search"
            />
          </div>
        </Form>
      )}
    </Formik>
  );
};

interface SelectNodeWidgetProps {
  onNodeSelected?: (node: Maybe<NodeListItemFragment>) => any;
}

export const SelectNodesWidget: React.FC<SelectNodeWidgetProps> = (props) => {
  const { data, loading, refetch } = withRekuest(useNodesQuery)();

  return (
    <div className="flex flex-col">
      <NodeFilterBox
        onFilterChanged={async (filter) => await refetch(filter)}
      />
      {data?.allnodes && (
        <NodeList
          nodes={data?.allnodes}
          onNodeSelected={props.onNodeSelected}
        />
      )}
    </div>
  );
};

interface SelectNodeModalProps {
  onNodeSelected: (node: Maybe<NodeListItemFragment>) => void;
}

export const SelectNodeModal: React.FC<SelectNodeModalProps> = ({
  onNodeSelected,
}) => {
  const { close, show } = useModal();

  return (
    <div className="inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
      <div className="bg-white px-4 pt-2 pb-4 sm:p-6 sm:pb-4">
        <div className="sm:flex sm:items-start">
          <div className="mt-1 text-center sm:mt-0 sm:mx-4 sm:text-left w-full">
            <Dialog.Title
              as="h3"
              className="text-xl mt-2 mb-2 leading-6 font-medium text-gray-900"
            >
              Select Your Nodes
            </Dialog.Title>
            <div className="mt-2 align-left text-left">
              <SelectNodesWidget
                onNodeSelected={(node) => {
                  close();
                  onNodeSelected(node);
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-4 pb-2 sm:flex sm:flex-row-reverse">
        <button
          type="button"
          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
          onClick={() => close()}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
