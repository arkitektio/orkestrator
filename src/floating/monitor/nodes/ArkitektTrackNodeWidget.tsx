import React from "react";
import "react-contexify/dist/ReactContexify.css";
import { Handle, Position } from "react-flow-renderer";
import { useDetailNodeQuery } from "../../../rekuest/api/graphql";
import { Reservation } from "../../../linker";
import { useNodeLayout, withLayout } from "../../base/node/layout";
import { ArkitektNodeProps } from "../../types";
import { useMonitorRiver } from "../context";
import { NodeMonitorLayout } from "./layout/NodeTrack";
import { withRekuest } from "../../../rekuest";

export const ArkitektTrackNodeWidget: React.FC<ArkitektNodeProps> = withLayout(
  ({ data, id }) => {
    const { reserveState } = useMonitorRiver();
    const { data: node_data, error } = withRekuest(useDetailNodeQuery)({
      variables: { hash: data?.hash },
    });
    const { isExpanded, toggleExpanded } = useNodeLayout();

    const reservation = reserveState?.reservations?.find(
      (e) => e?.reference === id
    );

    if (error) {
      return <NodeMonitorLayout id={id}>NOT AVAIALBLES</NodeMonitorLayout>;
    }

    return (
      <NodeMonitorLayout id={id}>
        {data.instream.map((s, index) => (
          <Handle
            type="target"
            position={Position.Left}
            id={"arg_" + index}
            style={{
              top: "50%",
              zIndex: "-1",
              cursor: "pointer",
              //boxShadow: "0px 0px 10px #ff1493",
            }}
            data-tip={
              s && s.length > 0
                ? s.map((s) => `${s?.kind} ${s?.key}`).join("|")
                : "Event"
            }
            data-for={"tooltip" + id}
          ></Handle>
        ))}
        {data.outstream.map((s, index) => (
          <Handle
            type="source"
            position={Position.Right}
            id={"return_" + index}
            style={{
              top: "50%",
              zIndex: "-1",
              cursor: "pointer",
              //boxShadow: "0px 0px 10px #ff1493",
            }}
            data-tip={
              s && s.length > 0
                ? s.map((s) => `${s?.kind} ${s?.key}`).join("|")
                : "Event"
            }
            data-for={"tooltip" + id}
          />
        ))}
        {reservation ? (
          <Reservation.DetailLink
            className="flex-initial font-light text-xl mb-1 custom-drag-handle cursor-pointer truncate"
            object={reservation?.id}
          >
            {node_data?.node?.name}{" "}
            <p className="flex-initial text-xs font-extralight truncate">
              {node_data?.node?.description}
            </p>
          </Reservation.DetailLink>
        ) : (
          <>Could not find reservation {id}! Critical Error.</>
        )}
      </NodeMonitorLayout>
    );
  }
);
