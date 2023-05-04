import { Dialog } from "@headlessui/react";
import { Field, Form, Formik, FormikHelpers } from "formik";
import { Maybe } from "graphql/jsutils/Maybe";
import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  DetailNodeDocument,
  DetailNodeQuery,
  NodeListItemFragment,
  NodeKind,
  useNodesQuery,
  Scope,
  NodeScope,
} from "../../../rekuest/api/graphql";
import { useRekuest, withRekuest } from "../../../rekuest/RekuestContext";
import { SmartModel } from "../../../rekuest/selection/SmartModel";
import { ChangeSubmitHelper } from "../../../rekuest/ui/helpers/ChangeSubmitter";
import { useModal } from "../../../components/modals/modal-context";
import {
  ArkitektNodeFragment,
  ReactiveNodeFragment,
  ReactiveTemplateFragment,
  StreamKind,
  useReactiveTemplateQuery,
  FlowFragment,
  useReactiveTemplatesQuery,
} from "../../../fluss/api/graphql";
import { withFluss } from "../../../fluss/fluss";
import { FlowNode } from "../../types";
import { notEmpty, port_to_stream } from "../../utils";
import { useEditRiver } from "../context";
import { Graph } from "../../base/Graph";

interface NodeListProps {
  nodes: Maybe<NodeListItemFragment>[];
}

export const LocalItem = ({ node }: { node: Maybe<NodeListItemFragment> }) => {
  return (
    <SmartModel
      accepts={[]}
      identifier="@arkitekt/node"
      object={node?.id || "ss"}
      dragClassName={({ isDragging }) =>
        `rounded-md dark:bg-slate-900 dark:text-slate-50 w-full hover:overflow-hidden p-2 shadow-md shadow-blue-700/20 bg-white hover:text-white hover:bg-gray-800 border-slate-500 border cursor-pointer ${
          isDragging && "border-primary-300"
        }`
      }
    >
      <div className="p-1 ">
        <div className="font-light text-md mb-1">{node?.name}</div>
        <p className="text">{node?.description}</p>
      </div>
    </SmartModel>
  );
};

export const GraphItem = () => {
  return (
    <SmartModel
      accepts={[]}
      identifier="@arkitekt/graphnode"
      object={"ss"}
      dragClassName={({ isDragging }) =>
        `rounded-md dark:bg-slate-900 dark:text-slate-50 w-full hover:overflow-hidden p-2 shadow-md shadow-blue-700/20 bg-white hover:text-white hover:bg-gray-800 border-slate-500 border cursor-pointer ${
          isDragging && "border-primary-300"
        }`
      }
    >
      <div className="p-1 ">
        <div className="font-light text-md mb-1">GraphNode</div>
      </div>
    </SmartModel>
  );
};

export const LocalNodes: React.FC<NodeListProps> = ({ nodes }) => {
  return (
    <div className="grid grid-cols-1 gap-4 text-gray-800 w-full mt-5">
      {nodes?.length > 0 && (
        <div className="font-semibold text-center text-xs dark:text-slate-50">
          Local Nodes
        </div>
      )}
      {nodes?.map((node) => (
        <LocalItem key={node?.id} node={node} />
      ))}
    </div>
  );
};

interface NodeFilterBoxProps {
  onFilterChanged: (values: NodeFilterValues) => any;
  className?: string;
  placeholder?: string;
}

interface NodeFilterValues {
  search: string;
}

export const NodeFilterBox: React.FC<NodeFilterBoxProps> = ({
  onFilterChanged,
  className,
  placeholder,
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
          <ChangeSubmitHelper debounce={200} />
          <Field
            className={
              className ||
              "flex-shrink flex-grow leading-normal w-px  border border-1 h-10 border-grey-600 rounded-l-none px-3 relative focus:border-blue focus:shadow"
            }
            name="search"
            placeholder={placeholder || "Search"}
          />
        </Form>
      )}
    </Formik>
  );
};

interface EditSidebarProps {
  flow: FlowFragment;
}

export const ExperimentalSidebar: React.FC<EditSidebarProps> = (props) => {
  if (!props.flow) return null;
  const { data: arkitektNodes, refetch: refetchArkiNodes } = withRekuest(
    useNodesQuery
  )({
    variables: {
      scopes: [NodeScope.Global],
    },
  });

  const { data: localNodes, refetch: refetchLocalNodes } = withRekuest(
    useNodesQuery
  )({
    variables: {
      restrict: props.flow.restrict,
      scopes: [
        NodeScope.BridgeGlobalToLocal,
        NodeScope.Local,
        NodeScope.BridgeLocalToGlobal,
      ],
    },
  });

  const { data: reactiveNodes, refetch: refetchReactiveNodes } = withFluss(
    useReactiveTemplatesQuery
  )();

  const [filter, setFilter] = React.useState<NodeFilterValues>({ search: "" });

  useEffect(() => {
    refetchArkiNodes(filter);
    refetchLocalNodes(filter);
    refetchReactiveNodes(filter);
  }, [filter]);

  return (
    <>
      <div className="flex-none p-5 dark:text-slate-50 overflow-hidden">
        <NodeFilterBox
          onFilterChanged={async (filter) => setFilter(filter)}
          className="w-full p-3 rounded-md shadow-lg dark:bg-slate-200 dark:text-black"
        />
      </div>
      <div className="flex-grow flex flex-col gap-2 p-5 overflow-y-scroll">
        <GraphItem />
        {localNodes?.allnodes && <LocalNodes nodes={localNodes?.allnodes} />}
      </div>
    </>
  );
};
