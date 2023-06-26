import { useEffect, useState } from "react";
import { ContractPulse } from "../../../fluss/components/ContractPulse";
import { SectionTitle } from "../../../layout/SectionTitle";
import { Reservation } from "../../../linker";
import { useLinkProvisionMate } from "../../../mates/provision/useLinkProvisionMate";
import { useUnlinkProvisionMate } from "../../../mates/provision/useUnlinkProvisionMate";
import { withRekuest } from "../../../rekuest";
import {
  PortFragment,
  ProvisionReferenceReservationQuery,
  useLinkableProvisionsQuery,
  useProvisionReferenceReservationQuery,
} from "../../../rekuest/api/graphql";
import { ProvisionCard } from "../../../rekuest/components/cards/ProvisionCard";
import { WidgetsContainer } from "../../../rekuest/widgets/containers/ReturnWidgetsContainer";
import { ArkitektNodeData, FlowNode } from "../../types";
import { notEmpty } from "../../utils";
import { useTraceRiver } from "../context";
import { SidebarProps } from "./types";

const ReservationInfo = ({
  reservation,
}: {
  reservation: Exclude<
    ProvisionReferenceReservationQuery["reservation"],
    undefined | null
  >;
}) => {
  let { data: provisions } = withRekuest(useLinkableProvisionsQuery)({
    variables: { reservation: reservation?.id },
  });

  const linkMate = useLinkProvisionMate(reservation);
  const unlinkMate = useUnlinkProvisionMate(reservation);

  return (
    <>
      <div className="text-white text-xl font-light"> Mapping To</div>

      <div className="mt-4 flex flex-col gap-2">
        {reservation?.provisions?.filter(notEmpty).map((p, index) => {
          return (
            <ProvisionCard key={index} provision={p} mates={[unlinkMate]} />
          );
        })}
      </div>
      <div className="flex-grow"></div>
      <div className="flex-initial mt-2">
        <div className="font-light mb-2 text-black text-xl dark:text-white">
          Linkable Provisions
        </div>
        <div className="flex flex-col gap-2">
          {provisions &&
            provisions.linkableprovisions
              ?.filter(notEmpty)
              .map((provision) => (
                <ProvisionCard provision={provision} mates={[linkMate]} />
              ))}
        </div>
      </div>
    </>
  );
};

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
      <div className="px-5 py-5 flex flex-col h-full">
        <div className="text-white text-xl mb-2">
          <div className="flex flex-row my-auto gap-2">
            {data?.reservation?.id && (
              <Reservation.DetailLink object={data?.reservation?.id}>
                {data?.reservation?.node?.name}
              </Reservation.DetailLink>
            )}
            <ContractPulse status={latestEvent?.state} />{" "}
          </div>
        </div>
        <div className="text-white text-cl mb-2">
          {data?.reservation?.node?.description}
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
        <div className="text-white flex-grow flex flex-col">
          {data?.reservation && (
            <ReservationInfo reservation={data.reservation} />
          )}
        </div>
        <div className="text-white text-cl mt-4"></div>
      </div>
    </>
  );
};
