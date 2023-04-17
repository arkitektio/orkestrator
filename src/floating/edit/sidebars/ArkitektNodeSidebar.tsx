import { Form, Formik } from "formik";
import { useEffect, useState } from "react";
import { NumberInputField } from "../../../components/forms/fields/number_input";
import { MapStrategy, ReserveParamsInput } from "../../../fluss/api/graphql";
import { withRekuest } from "../../../rekuest";
import {
  ReserveBindsInput,
  useDetailNodeQuery,
  useHashReservableTemplatesQuery,
} from "../../../rekuest/api/graphql";
import { ConstantsForm } from "../../../rekuest/components/ConstantsForm";
import { ReserveParamsField } from "../../../rekuest/components/ReserveParamsField";
import { ChangeSubmitHelper } from "../../../rekuest/ui/helpers/ChangeSubmitter";
import { ArkitektNodeData, FlowNode } from "../../types";
import { notEmpty } from "../../utils";
import { useEditRiver } from "../context";
import { SidebarProps } from "./types";

export const ArkitektNodeSidebar = (
  props: SidebarProps<FlowNode<ArkitektNodeData>>
) => {
  const { updateNodeIn, updateNodeOut, updateNodeExtras } = useEditRiver();
  const { data: node_data, error } = withRekuest(useDetailNodeQuery)({
    variables: { hash: props.node.data.hash },
  });
  const [advanced, setAdvanced] = useState(false);

  const { data } = withRekuest(useHashReservableTemplatesQuery)({
    variables: { hash: props.node.data.hash },
    fetchPolicy: "network-only",
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
          <Formik<{
            binds: ReserveBindsInput;
            reserveParams: ReserveParamsInput;
            allowLocal: boolean;
            mapStrategy: MapStrategy;
            reserveTimeout: number;
            assignTimeout: number;
            yieldTimeout: number;
          }>
            onSubmit={async (values) => {
              updateNodeExtras(props.node.id, {
                ...props.node.data,
                ...values,
              });
            }}
            initialValues={{
              binds: props.node.data.binds || { templates: [], clients: [] },
              reserveParams: props.node.data.reserveParams,
              allowLocal: props.node.data.allowLocal,
              mapStrategy: props.node.data.mapStrategy,
              reserveTimeout: props.node.data.reserveTimeout,
              assignTimeout: props.node.data.assignTimeout,
              yieldTimeout: props.node.data.yieldTimeout,
            }}
          >
            {(formikProps) => (
              <Form>
                <ChangeSubmitHelper debounce={400} />
                <div className="text-white mt-5">Reserve Params</div>
                {data?.reservableTemplates && (
                  <ReserveParamsField
                    templates={data?.reservableTemplates?.filter(notEmpty)}
                    name="binds"
                  />
                )}
                <button
                  type="button"
                  className="text-white mt-5"
                  onClick={() => setAdvanced(!advanced)}
                >
                  Advanced
                </button>
                {advanced && (
                  <div className="grid grid-cols-2 gap-2">
                    {/* 
                    <SelectInputField
                      label="Map Strategy"
                      options={enum_to_options(MapStrategy)}
                      name="mapStrategy"
                      labelClassName="text-white"
                      description="How long to wait for a reservation to succeed before giving up."
                    /> */}
                    <NumberInputField
                      label="reserveTimeout"
                      name="Reserve Tiemout"
                      labelClassName="text-white"
                      description="How long to wait for a reservation to succeed before giving up."
                    />
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
