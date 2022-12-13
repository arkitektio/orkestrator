import { Form, Formik } from "formik";
import { useEffect } from "react";
import {
  enum_to_options,
  SelectInputField,
} from "../../../components/forms/fields/select_input";
import {
  ReserveParamsInput,
  ReserveParams,
  MapStrategy,
} from "../../../fluss/api/graphql";
import { withRekuest } from "../../../rekuest";
import { useDetailNodeQuery } from "../../../rekuest/api/graphql";
import { ConstantsForm } from "../../../rekuest/components/ConstantsForm";
import { ArkitektNodeData, FlowNode } from "../../types";
import { useEditRiver } from "../context";
import { StreamDisplay } from "./StreamDisplay";
import { SidebarProps } from "./types";

export const ArkitektNodeSidebar = (
  props: SidebarProps<FlowNode<ArkitektNodeData>>
) => {
  const { updateNodeIn, updateNodeOut, updateNodeExtras } = useEditRiver();
  const { data: node_data, error } = withRekuest(useDetailNodeQuery)({
    variables: { hash: props.node.data.hash },
  });

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
      <div className="px-5 py-5 flex flex-col">
        <div className="text-white text-xl"> {node_data?.node?.name}</div>

        <div className="text-white text-cl mt-4">
          {" "}
          {node_data?.node?.description}
        </div>
        <StreamDisplay node={props.node} />
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
            autoSubmit={false}
            onSubmit={async (values, values_as_dict) => {
              updateNodeExtras(props.node.id, {
                ...props.node.data,
                defaults: values_as_dict,
              });
            }}
            initial={props.node.data.defaults}
          />
        )}
        <div className="text-white mt-5">Advanced</div>
        {node_data?.node?.id && (
          <Formik<{
            reserveParams: ReserveParamsInput;
            allowLocal: boolean;
            mapStrategy: MapStrategy;
          }>
            onSubmit={async (values) => {
              updateNodeExtras(props.node.id, {
                ...props.node.data,
                ...values,
              });
            }}
            initialValues={{
              reserveParams: props.node.data.reserveParams,
              allowLocal: props.node.data.allowLocal,
              mapStrategy: props.node.data.mapStrategy,
            }}
          >
            {(formikProps) => (
              <Form>
                <div className="text-white mt-5">Reserve Params</div>

                <SelectInputField
                  label="Map Strategy"
                  options={enum_to_options(MapStrategy)}
                  name="mapStrategy"
                />
                <button type="submit">Submit</button>
              </Form>
            )}
          </Formik>
        )}
      </div>
    </>
  );
};
