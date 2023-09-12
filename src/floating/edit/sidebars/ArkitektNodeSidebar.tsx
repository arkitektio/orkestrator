import { Form, Formik } from "formik";
import { useState } from "react";
import { CarouselInputField } from "../../../components/forms/fields/carousel_inputs";
import { NumberInputField } from "../../../components/forms/fields/number_input";
import { ArkitektNodeFragment, MapStrategy } from "../../../fluss/api/graphql";
import { withRekuest } from "../../../rekuest";
import {
  useDetailNodeQuery,
  useHashReservableTemplatesQuery,
} from "../../../rekuest/api/graphql";
import { ConstantsForm } from "../../../rekuest/components/ConstantsForm";
import { NodeDescription } from "../../../rekuest/components/NodeDescription";
import { ReserveParamsField } from "../../../rekuest/components/ReserveParamsField";
import { ChangeSubmitHelper } from "../../../rekuest/ui/helpers/ChangeSubmitter";
import { ArkitektNodeData, FlowNode } from "../../types";
import { notEmpty } from "../../utils";
import { useEditRiver } from "../context";
import { SidebarProps } from "./types";

export const ArkitektNodeSidebar = (
  props: SidebarProps<FlowNode<ArkitektNodeData>>
) => {
  const { updateNodeExtras, globals } = useEditRiver();
  const { data: node_data, error } = withRekuest(useDetailNodeQuery)({
    variables: { hash: props.node.data.hash },
  });
  const [advanced, setAdvanced] = useState(false);

  const { data } = withRekuest(useHashReservableTemplatesQuery)({
    variables: { hash: props.node.data.hash },
    fetchPolicy: "network-only",
  });

  const omitKeys = props.node.data.instream.at(0)?.map((s) => s?.key) || [];
  const omitKeys2 =
    globals
      ?.reduce(
        (a, b) => a.concat(b?.toKeys.filter(notEmpty) || []),
        [] as string[]
      )
      .filter((x) => x.startsWith(props.node.id))
      .map((x) => x.split(".").at(1)) || [];
  const omitKeys3 = omitKeys.concat(omitKeys2).filter(notEmpty);

  console.log("The defaults", props.node.data);

  return (
    <>
      {" "}
      <div className="px-5 py-5 flex flex-col h-full">
        <div className="text-white text-xl"> {node_data?.node?.name}</div>

        <div className="text-white mt-5">Constants</div>
        <div className="text-white text-cl mt-4">
          {node_data?.node?.id && (
            <ConstantsForm
              node={node_data?.node.id}
              omit={omitKeys3}
              autoSubmit={true}
              onSubmit={async (values, values_as_dict) => {
                updateNodeExtras(props.node.id, {
                  ...props.node.data,
                  defaults: values_as_dict,
                });
              }}
              initial={props.node.data.defaults}
              prependChildren={(formikProps) => {
                return (
                  <>
                    <div className="text-sm mb-2">
                      {node_data?.node?.description != undefined && (
                        <NodeDescription
                          description={node_data?.node?.description}
                          variables={formikProps.values}
                        />
                      )}
                    </div>
                  </>
                );
              }}
            />
          )}
        </div>
        <div className="flex flex-grow @container" />

        {node_data?.node?.id && (
          <Formik<Partial<ArkitektNodeFragment>>
            onSubmit={async (values) => {
              console.log("Updating Values", values);
              updateNodeExtras(props.node.id, {
                ...props.node.data,
                ...values,
              });
            }}
            initialValues={{
              binds: props.node.data.binds,
              allowLocal: props.node.data.allowLocal,
              mapStrategy: props.node.data.mapStrategy,
              reserveTimeout: props.node.data.reserveTimeout,
              assignTimeout: props.node.data.assignTimeout,
              yieldTimeout: props.node.data.yieldTimeout,
              maxRetries: props.node.data.maxRetries,
              retryDelay: props.node.data.retryDelay,
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
                    <CarouselInputField
                      label="Map Strategy"
                      options={[
                        {
                          value: MapStrategy.Map,
                          label: "Map",
                          description: "Sequential executing each request",
                        },
                        {
                          value: MapStrategy.AsCompleted,
                          label: "As Completed",
                          description:
                            "Immediately start executing each request, fowarding as they complete",
                        },
                        {
                          value: MapStrategy.Ordered,
                          label: "Ordered",
                          description:
                            "Immediately start executing each request, but forward them according to the original order",
                        },
                      ]}
                      name="mapStrategy"
                      labelClassName="text-white"
                      optionBuilder={(option) => (
                        <div className="flex-shrink"> {option.label}</div>
                      )}
                      description="How should we call the functionality?"
                    />
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
                    <NumberInputField
                      label="maxRetries"
                      name="maxRetries"
                      labelClassName="text-white"
                      description="How many times to retry a Task before giving up."
                    />
                    <NumberInputField
                      label="retryDelay"
                      name="retryDelay"
                      labelClassName="text-white"
                      description="How long to wait between retries"
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
