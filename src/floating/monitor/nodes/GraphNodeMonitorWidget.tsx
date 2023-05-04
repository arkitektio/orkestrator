import { useCallback, useState } from "react";
import { Resizable, ResizeCallbackData } from "react-resizable";
import { Handle, Position, useNodes } from "reactflow";
import { GraphNodeProps } from "../../types";
import { useMonitorRiver } from "../context";

export const GraphNodeMonitorWidget = ({ data, ...props }: GraphNodeProps) => {
  const {} = useMonitorRiver();

  const debouncedNodes = useNodes();
  //const [debouncedNodes] = useDebounce(nodes, 100);

  const [state, setState] = useState({
    isExpanded: false,
    isSelected: false,
    isHovered: false,
    width: 200,
    height: 200,
  });

  // On top layout
  const onResize = (
    event: React.SyntheticEvent,
    { size, handle }: ResizeCallbackData
  ) => {
    setState((state) => ({
      ...state,
      width: size.width,
      height: size.height,
      isExpanded: size.height > 200 && size.width > 200,
    }));
    event.stopPropagation();
  };

  const onDragOver = useCallback((event: any) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  return (
    <Resizable
      key={props.id}
      height={state.height}
      width={state.width}
      onResize={onResize}
      resizeHandles={["se"]}
    >
      <div
        style={{
          width: state.width + "px",
          height: state.height + "px",
        }}
        className="flex-1 flex border-green-500 shadow-green-500/50 dark:border-green-200 dark:shadow-green-200/10 border bg-slate-300/20 rounded  rounded-lg "
      >
        {data.instream.map((s, index) => (
          <Handle
            key={index}
            type="target"
            className={
              "cursor-pointer" +
              "border-[10px] border-pink-500 shadow-pink-500/5 dark:border-pink-200 dark:shadow-pink-200/10"
            }
            position={Position.Left}
            id={"arg_" + index}
            style={{
              left: "-8px",
              top: "50%",
              height: "50%",
              maxHeight: "300px",
              zIndex: "-1",
              borderRadius: "3px",
              cursor: "pointer",
              //boxShadow: "0px 0px 10px #ff1493",
            }}
            data-tip={
              s && s.length > 0
                ? s.map((s) => `${s?.kind} ${s?.key}`).join("|")
                : "Event"
            }
            data-for={"tooltip"}
          ></Handle>
        ))}
        {data.instream.map((s, index) => (
          <Handle
            key={"inside_index_" + index}
            type="source"
            className={
              "cursor-pointer" +
              "border-[10px] border-pink-500 shadow-pink-500/5 dark:border-pink-200 dark:shadow-pink-200/10"
            }
            position={Position.Right}
            id={"inside_return_" + index}
            style={{
              right: state.width - 20,
              top: "50%",
              height: "50%",
              maxHeight: "300px",
              zIndex: "-1",
              borderRadius: "3px",
              cursor: "pointer",
              //boxShadow: "0px 0px 10px #ff1493",
            }}
            data-tip={
              s && s.length > 0
                ? s.map((s) => `${s?.kind} ${s?.key}`).join("|")
                : "Event"
            }
            data-for={"tooltip"}
          ></Handle>
        ))}
        {data.outstream.map((s, index) => (
          <Handle
            key={"inside_arg_" + index}
            type="target"
            className={
              "cursor-pointer" +
              "border-[10px] border-pink-500 shadow-pink-500/5 dark:border-pink-200 dark:shadow-pink-200/10"
            }
            position={Position.Left}
            id={"inside_arg_" + index}
            style={{
              left: state.width - 20,
              top: "50%",
              height: "50%",
              maxHeight: "300px",
              zIndex: "-1",
              borderRadius: "3px",
              cursor: "pointer",
              //boxShadow: "0px 0px 10px #ff1493",
            }}
            data-tip={
              s && s.length > 0
                ? s.map((s) => `${s?.kind} ${s?.key}`).join("|")
                : "Event"
            }
            data-for={"tooltip"}
          ></Handle>
        ))}
        {data.outstream.map((s, index) => (
          <Handle
            key={index}
            type="source"
            className={
              "cursor-pointer" +
              "border-[10px] border-pink-500 shadow-pink-500/5 dark:border-pink-200 dark:shadow-pink-200/10"
            }
            position={Position.Right}
            id={"return_" + index}
            style={{
              right: "-8px",
              top: "50%",
              height: "50%",
              maxHeight: "300px",
              zIndex: "-1",
              borderRadius: "3px",
              //boxShadow: "0px 0px 10px #ff1493",
            }}
            data-tip={
              s && s.length > 0
                ? s.map((s) => `${s?.kind} ${s?.key}`).join("|")
                : "Event"
            }
            data-for={"tooltip"}
          />
        ))}
        <div onDragOver={onDragOver} className="flex-grow custom-drag-handle">
          d
        </div>
      </div>
    </Resizable>
  );
};
