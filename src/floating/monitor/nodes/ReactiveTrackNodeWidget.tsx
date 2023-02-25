import React from "react";
import "react-contexify/dist/ReactContexify.css";
import { Handle, Position } from "reactflow";
import ReactTooltip from "react-tooltip";
import { withLayout } from "../../base/node/layout";
import { ReactiveNodeProps } from "../../types";
import { NodeMonitorLayout } from "./layout/NodeTrack";

export const ReactiveTrackNodeWidget: React.FC<ReactiveNodeProps> = withLayout(
  ({ data: { outstream, instream, constream, implementation }, id }) => {
    return (
      <>
        {/* <AssignEventOverlay event={data.latestAssignEvent} />
				<ProvideEventOverlay event={data.latestProvideEvent} /> */}
        <NodeMonitorLayout id={id}>
          <div className="flex flex-row w-full truncate overflow-ellipsis custom-drag-handle cursor-pointer">
            <div className="flex-none font-light text-xl mb-1"></div>
            <div className="flex-grow"></div>
          </div>
          <p className="text-gray-700 text-xs custom-drag-handle cursor-pointer">
            @{implementation}
          </p>
        </NodeMonitorLayout>

        {constream?.map((s, index, array) => (
          <Handle
            type="target"
            position={Position.Bottom}
            id={`kwarg_${index}`}
            key={index}
            style={{
              background: "#555",
              marginTop: 10,
            }}
            data-tip={s && s.map((arg) => arg?.kind).join("|")}
            data-for={"tooltip" + id}
          ></Handle>
        ))}
        {instream?.map((s, index, array) => (
          <Handle
            type="target"
            position={Position.Left}
            id={`arg_${index}`}
            style={{
              top: `${(100 / array.length) * index + 50 / array.length}%`,
              background: "#555",
            }}
            data-tip={s && s.map((arg) => arg?.kind).join("|")}
            data-for={"tooltip" + id}
          />
        ))}
        {outstream?.map((s, index, array) => (
          <Handle
            type="source"
            position={Position.Right}
            id={`return_${index}`}
            style={{
              top: `${(100 / array.length) * index + 50 / array.length}%`,
              background: "#555",
            }}
            data-tip={s && s.map((arg) => arg?.kind).join("|")}
            data-for={"tooltip" + id}
          />
        ))}
        <ReactTooltip id={"tooltip" + id} />
      </>
    );
  }
);
