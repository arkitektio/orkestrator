import React, { useState } from "react";
import "react-contexify/dist/ReactContexify.css";
import { BsPlay, BsStop } from "react-icons/bs";
import ReactTooltip from "react-tooltip";
import { Handle, Position } from "reactflow";
import { RunEventFragment, RunEventType } from "../../../fluss/api/graphql";
import { withRekuest } from "../../../rekuest";
import { NodeKind, useDetailNodeQuery } from "../../../rekuest/api/graphql";
import { NodeDescription } from "../../../rekuest/components/NodeDescription";
import { WidgetsContainer } from "../../../rekuest/widgets/containers/ReturnWidgetsContainer";
import { useNodeLayout, withLayout } from "../../base/node/layout";
import { ArkitektNodeProps } from "../../types";
import { notEmpty } from "../../utils";
import { useTrackRiver } from "../context";
import { NodeTrackLayout } from "./layout/NodeTrack";

export const ArkitektTrackNodeWidget: React.FC<ArkitektNodeProps> = withLayout(
  ({ data, id }) => {
    const { runState } = useTrackRiver();
    const { data: node_data, error } = withRekuest(useDetailNodeQuery)({
      variables: { hash: data.hash },
    });
    const { isExpanded, toggleExpanded } = useNodeLayout();

    const [frozenevent, setFrozenEvent] = useState<
      RunEventFragment | null | undefined
    >();

    const latestEvent =
      frozenevent || runState?.events?.find((e) => e?.source === id);


    const border =
      data.kind === NodeKind.Generator
        ? "1px solid #ff0033"
        : "1px solid #ff00ff";

    return (
      <NodeTrackLayout id={id}>
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
        <ReactTooltip id={"tooltip" + id} />
        <div
          className="flex-initial font-light text-xl mb-1 custom-drag-handle cursor-pointer truncate"
          onDoubleClick={() => toggleExpanded()}
        >
          <div className="w-full flex flex-row justify-between">
            {node_data?.node?.name || data.name}{" "}
            <button
              type="button"
              className="text-md font-light"
              onClick={() =>
                setFrozenEvent(
                  frozenevent == undefined ? latestEvent : undefined
                )
              }
              title="Toggle freeze"
              aria-details="Toggles freezing the node at the current event"
            >
              {frozenevent == undefined ? <BsStop /> : <BsPlay />}
            </button>
          </div>
        </div>
        <p className="flex-initial text-xs font-extralight truncate">
          {node_data?.node?.description && <NodeDescription description={node_data?.node?.description}/>}
        </p>
        {isExpanded && (
          <>
            <div
              className={"px-2 py-2 flex-grow flex flex-col overflow-hidden"}
            >
              {latestEvent &&
                node_data?.node?.returns &&
                latestEvent.type === RunEventType.Next && (
                  <WidgetsContainer
                    ports={node_data?.node?.returns.filter(notEmpty)}
                    values={latestEvent.value}
                  />
                )}
              {latestEvent && latestEvent.type === RunEventType.Complete && (
                <div className="text-center font-light p-5">
                  Node is complete
                </div>
              )}
              {latestEvent && latestEvent.type === RunEventType.Error && (
                <div className="text-center font-light p-5">
                  {latestEvent.value}
                </div>
              )}
              {!latestEvent && (
                <div className="text-center font-light p-5">
                  No event yet...
                </div>
              )}
            </div>
            <ReactTooltip delayShow={500} id={"tooltip_special" + id} />
          </>
        )}
      </NodeTrackLayout>
    );
  }
);
