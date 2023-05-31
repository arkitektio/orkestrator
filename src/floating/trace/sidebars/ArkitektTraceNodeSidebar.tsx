import { useEffect, useState } from "react";
import { SectionTitle } from "../../../layout/SectionTitle";
import { withRekuest } from "../../../rekuest";
import {
  PortFragment,
  useProvisionReferenceReservationQuery,
} from "../../../rekuest/api/graphql";
import { ProvisionCard } from "../../../rekuest/components/cards/ProvisionCard";
import { WidgetsContainer } from "../../../rekuest/widgets/containers/ReturnWidgetsContainer";
import { ArkitektNodeData, FlowNode } from "../../types";
import { notEmpty } from "../../utils";
import { RetriableDisplay } from "../components/RetriableDisplay";
import { useTraceRiver } from "../context";
import { SidebarProps } from "./types";

export const ArkitektTraceNodeSidebar = (
  props: SidebarProps<FlowNode<ArkitektNodeData>>
) => {
  const { conditionState, condition } = useTraceRiver();
  const { data, error } = withRekuest(useProvisionReferenceReservationQuery)({
    variables: { reference: props.node.id, provision: condition?.provision },
  });
  const [portArg, setPortArg] = useState<
    { ports: PortFragment[]; args: any[] } | undefined
  >(undefined);

  const latestEvent = conditionState?.events?.find(
    (e) => e?.source === props.node.id
  );

  useEffect(() => {
    if (data?.reservation?.node?.args) {
      let args: any[] = [];
      let ports: PortFragment[] = [];
      let defaults: { [key: string]: any } = props.node.data?.defaults || {};

      data?.reservation.node.args.filter(notEmpty).forEach((arg) => {
        if (arg.key in defaults && defaults[arg.key]) {
          args.push(defaults[arg.key]);
          ports.push(arg);
        } else if (arg.default) {
          args.push(arg.default);
          ports.push(arg);
        }
      });

      console.log(args, ports);
      if (args.length > 0) {
        setPortArg({ args, ports });
      } else {
        setPortArg(undefined);
      }
    }
  }, [data]);

  return (
    <>
      {" "}
      <div className="px-5 py-5 flex flex-col">
        <div className="text-white text-xl mb-2">
          {" "}
          {data?.reservation?.node?.name}
        </div>
        {portArg && (
          <>
            <SectionTitle>Defaults</SectionTitle>
            <div className="mt-4">
              {portArg && (
                <WidgetsContainer values={portArg.args} ports={portArg.ports} />
              )}
            </div>
          </>
        )}
        <div className="text-white text-cl mt-4 ,b-2">
          Mapping to{" "}
          {data?.reservation?.provisions?.filter(notEmpty).map((p, index) => {
            return <ProvisionCard key={index} provision={p} />;
          })}
        </div>
        <RetriableDisplay node={props.node.data} />

        <div className="text-white text-cl mt-4"></div>
      </div>
    </>
  );
};
