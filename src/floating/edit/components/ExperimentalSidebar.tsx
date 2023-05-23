import { Field, Form, Formik, FormikHelpers } from "formik";
import { Maybe } from "graphql/jsutils/Maybe";
import React, { useEffect } from "react";
import { FlowFragment } from "../../../fluss/api/graphql";
import { withRekuest } from "../../../rekuest/RekuestContext";
import {
  DisplayTemplateFragment,
  NodeScope,
  useNodeTemplatesQuery,
} from "../../../rekuest/api/graphql";
import { SmartModel } from "../../../rekuest/selection/SmartModel";
import { ChangeSubmitHelper } from "../../../rekuest/ui/helpers/ChangeSubmitter";

interface NodeListProps {
  templates: Maybe<DisplayTemplateFragment>[];
}

export const LocalItem = ({
  template,
}: {
  template: Maybe<DisplayTemplateFragment>;
}) => {
  return (
    <SmartModel
      accepts={[]}
      identifier="@arkitekt/template"
      object={template?.id || "ss"}
      dragClassName={({ isDragging }) =>
        `rounded-md dark:bg-slate-900 dark:text-slate-50 w-full hover:overflow-hidden p-2 shadow-md shadow-blue-700/20 bg-white hover:text-white hover:bg-gray-800 border-slate-500 border cursor-pointer ${
          isDragging && "border-primary-300"
        }`
      }
    >
      <div className="p-1 ">
        <div className="font-light text-md mb-1">
          {template?.node?.name} @ {template?.interface}
        </div>
        <p className="text">{template?.node?.description}</p>
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

export const LocalTemplate: React.FC<NodeListProps> = ({ templates }) => {
  return (
    <div className="grid grid-cols-1 gap-4 text-gray-800 w-full mt-5">
      {templates?.length > 0 && (
        <div className="font-semibold text-center text-xs dark:text-slate-50">
          Local Nodes
        </div>
      )}
      {templates?.map((template) => (
        <LocalItem key={template?.id} template={template} />
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

  const { data: localNodes, refetch: refetchLocalNodes } = withRekuest(
    useNodeTemplatesQuery
  )({
    variables: {
      scopes: [
        NodeScope.BridgeGlobalToLocal,
        NodeScope.Local,
        NodeScope.BridgeLocalToGlobal,
      ],
    },
  });

  const [filter, setFilter] = React.useState<NodeFilterValues>({ search: "" });

  useEffect(() => {
    refetchLocalNodes(filter);
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
        {localNodes?.templates && (
          <LocalTemplate templates={localNodes?.templates} />
        )}
      </div>
    </>
  );
};
