import {
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { withLayout } from "../../base/node/layout";
import { useDrop } from "react-dnd";
import {
  NodeProps,
  useReactFlow,
  useNodes,
  useNodesState,
  Handle,
  Position,
} from "reactflow";
import { useEditRiver } from "../context";
import { useFluss } from "../../../fluss/fluss-context";
import {
  DetailNodeDocument,
  DetailNodeQuery,
  NodeKind,
  NodeScope,
} from "../../../rekuest/api/graphql";
import { FlowNode, GraphNodeProps } from "../../types";
import {
  ArkitektNodeFragment,
  LocalNodeFragment,
  MapStrategy,
  ReactiveNodeFragment,
  ReactiveTemplateDocument,
  ReactiveTemplateQuery,
} from "../../../fluss/api/graphql";
import { v4 as uuidv4 } from "uuid";
import { notEmpty, port_to_stream } from "../../utils";
import { useRekuest } from "../../../rekuest";
import { useDebounce } from "use-debounce";
import { Resizable, ResizeCallbackData } from "react-resizable";

export const GraphNodeEditWidget = ({ data, ...props }: GraphNodeProps) => {
  const { addReactive, addArkitekt } = useEditRiver();

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

  useEffect(() => {
    let children = debouncedNodes.filter((n) => n.parentNode == props.id);

    if (children.length == 0) {
      setState((state) => ({
        ...state,
        width: 200,
        height: 200,
      }));
    } else {
      let heighestY = children
        .map((x) => x.position.y)
        .reduce((a, b) => Math.max(a, b));
      let heighestX = children
        .map((x) => x.position.x)
        .reduce((a, b) => Math.max(a, b));

      setState((state) => ({
        ...state,
        width: heighestX + 200,
        height: heighestY + 200,
      }));
    }
  }, []);

  const { client: flussapi } = useFluss();
  const { client: rekuestapi } = useRekuest();

  const onDragOver = useCallback((event: any) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const [{ isOver, canDrop, type }, dropref] = useDrop(() => {
    return {
      accept: [
        "item:@arkitekt/node",
        "list:@arkitekt/node",
        "item:@arkitekt/graphnode",
        "list:@arkitekt/graphnode",
        "item:@fluss/reactivetemplate",
        "list:@fluss/reactivetemplate",
      ],

      drop: (items: { object: string; identifier: string }[], monitor) => {
        if (!monitor.didDrop()) {
          console.log("Ommitting Parent Drop");
        }

        console.log("hallo");

        let x = monitor && monitor.getClientOffset()?.x;
        let y = monitor && monitor.getClientOffset()?.y;

        items.map((i, index) => {
          const id = i.object;
          const type = i.identifier;

          if (id && x && y && type) {
            const position = {
              x: 10,
              y: 15,
            };

            if (type == "@arkitekt/node") {
              rekuestapi &&
                rekuestapi
                  .query<DetailNodeQuery>({
                    query: DetailNodeDocument,
                    variables: { id: id },
                  })
                  .then((event) => {
                    console.log(event);

                    if (event.data?.node) {
                      // two paths according to node scope
                      if (event.data.node.scope == NodeScope.Global) {
                        let id = "@" + props.id + "/" + "arkid-" + uuidv4();
                        let node: FlowNode<ArkitektNodeFragment> = {
                          id: id,
                          type: "ArkitektNode",
                          dragHandle: ".custom-drag-handle",
                          data: {
                            __typename: "ArkitektNode",
                            instream: [
                              event?.data?.node?.args
                                ?.filter(
                                  (x) => !x?.nullable && x?.default == undefined
                                ) // by default, all nullable and default values are optional so not part of stream
                                .filter(notEmpty)
                                .map(port_to_stream) || [],
                            ],
                            mapStrategy: MapStrategy.Map,
                            allowLocal: false,
                            assignTimeout: 2000,
                            yieldTimeout: 2000,
                            reserveTimeout: 2000,
                            outstream: [
                              event?.data?.node?.returns
                                ?.filter(notEmpty)
                                .map(port_to_stream) || [],
                            ],
                            constream: [],
                            name: event.data?.node?.name || "no-name",
                            hash: event.data?.node?.hash || "",
                            kind: event.data?.node?.kind || NodeKind.Generator,
                          },
                          position: position,
                          parentNode: props.id,
                          extent: "parent",
                        };
                        addArkitekt(node);
                      } else {
                        let id = "@" + props.id + "/" + "localid-" + uuidv4();
                        let node: FlowNode<LocalNodeFragment> = {
                          id: id,
                          type: "LocalNode",
                          dragHandle: ".custom-drag-handle",
                          data: {
                            __typename: "LocalNode",
                            instream: [
                              event?.data?.node?.args
                                ?.filter(
                                  (x) => !x?.nullable && x?.default == undefined
                                ) // by default, all nullable and default values are optional so not part of stream
                                .filter(notEmpty)
                                .map(port_to_stream) || [],
                            ],
                            mapStrategy: MapStrategy.Map,
                            allowLocal: false,
                            assignTimeout: 2000,
                            yieldTimeout: 2000,
                            outstream: [
                              event?.data?.node?.returns
                                ?.filter(notEmpty)
                                .map(port_to_stream) || [],
                            ],
                            constream: [],
                            name: event.data?.node?.name || "no-name",
                            hash: event.data?.node?.hash || "",
                            kind: event.data?.node?.kind || NodeKind.Generator,
                          },
                          position: position,
                          parentNode: props.id,
                          extent: "parent",
                        };
                        addArkitekt(node);
                      }
                    }
                  });
            }

            if (type == "@fluss/reactivetemplate") {
              flussapi &&
                flussapi
                  .query<ReactiveTemplateQuery>({
                    query: ReactiveTemplateDocument,
                    variables: { id: id },
                  })
                  .then((event) => {
                    console.log(event);

                    let id = "reactive-" + uuidv4();
                    if (!event.data?.reactivetemplate?.implementation)
                      return null;

                    let node: FlowNode<ReactiveNodeFragment> = {
                      id: id,
                      type: "ReactiveNode",
                      dragHandle: ".custom-drag-handle",
                      data: {
                        __typename: "ReactiveNode",
                        instream: event.data.reactivetemplate?.instream || [],
                        outstream: event.data.reactivetemplate?.outstream || [],
                        constream: event.data.reactivetemplate?.constream || [],
                        implementation:
                          event.data?.reactivetemplate?.implementation || "",
                      },
                      position: position,
                    };
                    addArkitekt(node);
                  });
            }
            if (type == "@arkitekt/graphnode") {
              alert("You can't drop a graph node here");
            }
          }
        });

        return {};
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        type: monitor.getItemType(),
        canDrop: !!monitor.canDrop(),
      }),
    };
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
        <div
          onDragOver={onDragOver}
          ref={dropref}
          className="flex-grow custom-drag-handle"
        >
          d
        </div>
      </div>
    </Resizable>
  );
};
