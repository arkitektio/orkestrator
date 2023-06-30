import { Field, Form, Formik, FormikHelpers } from "formik";
import { Maybe } from "graphql/jsutils/Maybe";
import React, { useEffect } from "react";
import {
  FlowFragment,
  ReactiveTemplateFragment,
  useReactiveTemplatesQuery,
} from "../../../fluss/api/graphql";
import { withFluss } from "../../../fluss/fluss";
import { DashboardSearchFilter } from "../../../pages/dashboard/DashboardSearch";
import { withRekuest } from "../../../rekuest/RekuestContext";
import {
  NodeListItemFragment,
  NodeScope,
  useNodesQuery,
} from "../../../rekuest/api/graphql";
import { SmartModel } from "../../../rekuest/selection/SmartModel";
import { ChangeSubmitHelper } from "../../../rekuest/ui/helpers/ChangeSubmitter";
import { notEmpty } from "../../utils";

interface NodeListProps {
  nodes: Maybe<NodeListItemFragment>[];
}

export const NodeItem = ({ node }: { node: Maybe<NodeListItemFragment> }) => {
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

export const ReactiveItem = ({ node }: { node: any }) => {
  return (
    <SmartModel
      accepts={[]}
      identifier="@fluss/reactivetemplate"
      object={node?.id}
      dragClassName={({ isDragging }) =>
        `rounded-md dark:bg-slate-900 dark:text-slate-50 w-full hover:overflow-hidden p-2 shadow-md shadow-blue-700/20 bg-white hover:text-white hover:bg-gray-800 border-slate-500 border cursor-pointer ${
          isDragging && "border-primary-300"
        }`
      }
    >
      <div className="p-1 ">
        <div className="font-light text-md mb-1">{node?.name}</div>
        <div className="p-1 text-xs truncate">{node.implementation}</div>
      </div>
    </SmartModel>
  );
};

export const NodeList: React.FC<NodeListProps> = ({ nodes }) => {
  return (
    <div className="grid grid-cols-1 gap-4 text-gray-800 w-full mt-5">
      {nodes?.length > 0 && (
        <div className="font-semibold text-center text-xs dark:text-slate-50">
          Arkitekt Nodes
        </div>
      )}
      {nodes?.map((node) => (
        <NodeItem key={node?.id} node={node} />
      ))}
    </div>
  );
};

export const ReactiveList: React.FC<{
  nodes: Maybe<ReactiveTemplateFragment>[];
}> = ({ nodes }) => {
  return (
    <div className="grid grid-cols-1 gap-4 text-gray-800 w-full">
      {nodes?.length > 0 && (
        <div className="font-semibold text-center text-xs dark:text-slate-50">
          Reactive Nodes
        </div>
      )}
      {nodes?.filter(notEmpty).map((node, index) => (
        <ReactiveItem node={node} key={node.id} />
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

export const EditSidebar: React.FC<EditSidebarProps> = (props) => {
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
        <DashboardSearchFilter
          onFilterChanged={setFilter}
          className="w-full p-3 rounded-md shadow-lg dark:bg-slate-200 dark:text-black"
        />
      </div>
      <div className="flex-grow flex flex-col gap-2 p-5 overflow-y-scroll">
        {arkitektNodes?.allnodes && (
          <NodeList nodes={arkitektNodes?.allnodes} />
        )}
        {reactiveNodes?.reactivetemplates && (
          <ReactiveList nodes={reactiveNodes?.reactivetemplates} />
        )}
      </div>
    </>
  );
};
