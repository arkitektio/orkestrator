import { Form, Formik } from "formik";
import { useEffect, useState } from "react";
import { NumberInputField } from "../../../components/forms/fields/number_input";
import { LocalNodeFragment, MapStrategy } from "../../../fluss/api/graphql";
import { withRekuest } from "../../../rekuest";
import { useDetailNodeQuery } from "../../../rekuest/api/graphql";
import { ConstantsForm } from "../../../rekuest/components/ConstantsForm";
import { ChangeSubmitHelper } from "../../../rekuest/ui/helpers/ChangeSubmitter";
import { FlowNode, LocalNodeData } from "../../types";
import { useEditRiver } from "../context";
import { SidebarProps } from "./types";

export const LocalNodeSidebar = (
  props: SidebarProps<FlowNode<LocalNodeData>>
) => {
  const { updateNodeIn, updateNodeOut, updateNodeExtras } = useEditRiver();
  const { data: node_data, error } = withRekuest(useDetailNodeQuery)({
    variables: { hash: props.node.data.hash },
  });
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    if (node_data) {
      updateNodeExtras(props.node.id, {
        ...props.node.data,
        extras: node_data.node,
      });
    }
  }, [node_data]);

  return (
    <>
      {" "}
      <div className="px-5 py-5 flex flex-col h-full">
        <div className="text-white text-xl"> {node_data?.node?.name}</div>

        <div className="text-white text-cl mt-4">
          {" "}
          {node_data?.node?.description}
        </div>
        <div className="text-white mt-5">Constants</div>
        {node_data?.node?.id && (
          <ConstantsForm
            node={node_data?.node.id}
            omit={
              (props.node.data.instream[0] &&
                props.node.data.instream[0].map(
                  (s) => s?.key || "oisnosins"
                )) ||
              []
            }
            autoSubmit={true}
            onSubmit={async (values, values_as_dict) => {
              updateNodeExtras(props.node.id, {
                ...props.node.data,
                defaults: values_as_dict,
              });
            }}
            initial={props.node.data.defaults}
          />
        )}
        <div className="flex flex-grow" />

        {node_data?.node?.id && (
          <Formik<Partial<LocalNodeFragment>>
            onSubmit={async (values) => {
              updateNodeExtras(props.node.id, {
                ...props.node.data,
                ...values,
              });
            }}
            initialValues={{
              allowLocal: props.node.data.allowLocal,
              mapStrategy: props.node.data.mapStrategy,
              assignTimeout: props.node.data.assignTimeout,
              yieldTimeout: props.node.data.yieldTimeout,
            }}
          >
            {(formikProps) => (
              <Form>
                <ChangeSubmitHelper debounce={400} />
                <button
                  type="button"
                  className="text-white mt-5"
                  onClick={() => setAdvanced(!advanced)}
                >
                  Advanced
                </button>
                {advanced && (
                  <div className="grid grid-cols-2 gap-2">
                    <NumberInputField
                      label="assignTimeout"
                      name="assignTimeout"
                      labelClassName="text-white"
                      description="How long to wait for a Task to succeed before giving up."
                    />
                    <NumberInputField
                      label="yieldTimeout"
                      name="yieldTimeout"
                      labelClassName="text-white"
                      description="How long to wait for a Task to yield to succeed before giving up."
                    />
                  </div>
                )}
              </Form>
            )}
          </Formik>
        )}
      </div>
    </>
  );
};
