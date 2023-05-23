import { withRekuest } from "../../../rekuest";
import { useProvisionReferenceReservationQuery } from "../../../rekuest/api/graphql";
import { ProvisionCard } from "../../../rekuest/components/cards/ProvisionCard";
import { ArkitektNodeData, FlowNode } from "../../types";
import { notEmpty } from "../../utils";
import { useTraceRiver } from "../context";
import { SidebarProps } from "./types";

export const ArkitektTraceNodeSidebar = (
  props: SidebarProps<FlowNode<ArkitektNodeData>>
) => {
  const { conditionState, condition } = useTraceRiver();
  const { data, error } = withRekuest(useProvisionReferenceReservationQuery)({
    variables: { reference: props.node.id, provision: condition?.provision },
  });

  const latestEvent = conditionState?.events?.find(
    (e) => e?.source === props.node.id
  );

  return (
    <>
      {" "}
      <div className="px-5 py-5 flex flex-col">
        <div className="text-white text-xl">
          {" "}
          {data?.reservation?.node?.name}
        </div>
        <div className="text-white text-cl mt-4">
          Mapping to{" "}
          {data?.reservation?.provisions?.filter(notEmpty).map((p, index) => {
            return <ProvisionCard key={index} provision={p} />;
          })}
        </div>

        {latestEvent?.value}
        <div className="text-white text-cl mt-4"></div>
      </div>
    </>
  );
};
