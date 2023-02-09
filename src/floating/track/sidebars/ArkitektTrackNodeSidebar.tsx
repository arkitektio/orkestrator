import { Form, Formik } from "formik";
import { useEffect } from "react";
import { NumberInputField } from "../../../components/forms/fields/number_input";
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
import { useTrackRiver } from "../context";
import { SidebarProps } from "./types";

export const ArkitektTrackNodeSidebar = (
  props: SidebarProps<FlowNode<ArkitektNodeData>>
) => {
  const { runState } = useTrackRiver();
  const { data: node_data, error } = withRekuest(useDetailNodeQuery)({
    variables: { hash: props.node.data.hash },
  });

  const latestEvent = runState?.events?.find(
    (e) => e?.source === props.node.id
  );

  return (
    <>
      {" "}
      <div className="px-5 py-5 flex flex-col">
        <div className="text-white text-xl"> {node_data?.node?.name}</div>
        <div className="text-white text-cl mt-4">
          {" "}
          {node_data?.node?.description}
        </div>

        {latestEvent?.type == "NEXT" && (
          <>{JSON.stringify(latestEvent.value)}</>
        )}
        {latestEvent?.type == "ERROR" && (
          <div className="text-red-200">{latestEvent.value}</div>
        )}
        <div className="text-white text-cl mt-4"></div>
      </div>
    </>
  );
};
