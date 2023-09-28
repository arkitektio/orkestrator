import React, { useEffect } from "react";
import "react-contexify/dist/ReactContexify.css";
import {
  AiOutlineArrowRight,
  AiOutlineArrowUp,
  AiOutlineGlobal,
} from "react-icons/ai";
import { Handle, Position } from "reactflow";
import { withRekuest } from "../../../rekuest";
import {
  NodeKind,
  PortFragment,
  useDetailNodeQuery,
} from "../../../rekuest/api/graphql";
import { useNodeLayout, withLayout } from "../../base/node/layout";
import { ArkitektNodeProps } from "../../types";
import { globalArgKey, notEmpty, rekuestPortToFluss } from "../../utils";
import { useEditRiver } from "../context";
import { useArkitektConnState } from "../hooks/useArkitektConnState";
import { NodeEditLayout } from "./layout/NodeEdit";

export const ArkitektEditNodeWidget: React.FC<ArkitektNodeProps> = withLayout(
  ({ data, id, isConnectable }) => {
    const {
      updateNodeIn,
      updateNodeOut,
      updateNodeExtras,
      nodes,
      addGlobal,
      setGlobals,
      globals,
      args,
    } = useEditRiver();

    const { data: node_data, error } = withRekuest(useDetailNodeQuery)({
      variables: { hash: data.hash },
    });

    const conState = useArkitektConnState(id, nodes);

    useEffect(() => {
      if (node_data) {
        updateNodeExtras(id, { ...data, extras: node_data.node });
      }
    }, [node_data]);

    const { isExpanded, toggleExpanded } = useNodeLayout();

    const handleItemClick = ({ event, props }: any) =>
      console.log(event, props);

    const border =
      data.kind === NodeKind.Generator
        ? "1px solid #ff0033"
        : "1px solid #ff00ff";

    const rotateArg = (arg: PortFragment) => {
      if (data?.instream[0]) {
        if (
          globals?.find((s) => s?.toKeys.includes(globalArgKey(id, arg.key)))
        ) {
          setGlobals(
            globals
              .map((s) =>
                s?.toKeys.includes(globalArgKey(id, arg.key))
                  ? s.toKeys.length == 1
                    ? undefined
                    : {
                        ...s,
                        toKeys: s.toKeys.filter(
                          (k) => k !== globalArgKey(id, arg.key)
                        ),
                      }
                  : s
              )
              .filter(notEmpty)
          );
        }

        console.log("Stream", data.instream[0]);
        if (data?.instream[0]?.find((s) => s?.key === arg.key)) {
          updateNodeIn(id, [
            data.instream[0].filter((s) => s?.key !== arg.key),
          ]);
        } else {
          updateNodeIn(id, [
            data?.instream[0]?.concat(rekuestPortToFluss(arg)),
          ]);
        }
      }
    };

    const setArg = (arg: PortFragment) => {
      if (data?.instream[0]) {
        console.log("Stream", data.instream[0]);
        if (data?.instream[0]?.find((s) => s?.key === arg.key)) {
          updateNodeIn(id, [
            data.instream[0].filter((s) => s?.key !== arg.key),
          ]);
        }

        if (
          globals?.find((s) => s?.toKeys.includes(globalArgKey(id, arg.key)))
        ) {
          setGlobals(
            globals
              .map((s) =>
                s?.toKeys.includes(globalArgKey(id, arg.key))
                  ? s.toKeys.length == 1
                    ? undefined
                    : {
                        ...s,
                        toKeys: s.toKeys.filter(
                          (k) => k !== globalArgKey(id, arg.key)
                        ),
                      }
                  : s
              )
              .filter(notEmpty)
          );
        } else {
          setGlobals(
            globals?.concat({
              toKeys: [globalArgKey(id, arg.key)],
              port: rekuestPortToFluss({
                ...arg,
                description:
                  (arg.description || "") +
                  ` (maps to ${globalArgKey(id, arg.key)})`,
              }),
            }) || []
          );
        }
      }
    };

    const rotateReturn = (arg: PortFragment) => {
      if (data?.outstream[0]) {
        console.log("Stream", data.outstream[0]);
        if (data?.outstream[0]?.find((s) => s?.key === arg.key)) {
          updateNodeOut(id, [
            data.outstream[0].filter((s) => s?.key !== arg.key),
          ]);
        } else {
          updateNodeOut(id, [
            data?.outstream[0]?.concat(rekuestPortToFluss(arg)),
          ]);
        }
      }
    };

    if (error) {
      return <NodeEditLayout id={id}>NOT AVAIALBLES</NodeEditLayout>;
    }

    return (
      <NodeEditLayout
        id={id}
        color={node_data?.node?.kind === NodeKind.Function ? "pink" : "red"}
        connState={conState}
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
              top: "50%",
              height: "50%",
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
            isConnectable={conState.isConnectable}
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
              top: "50%",
              height: "50%",
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
            isConnectable={conState.isConnectable}
          />
        ))}
        <div className="flex flex-row w-full truncate overflow-ellipsis">
          <div
            className="flex-none font-light text-xl mb-1 custom-drag-handle cursor-pointer"
            onDoubleClick={() => toggleExpanded()}
          >
            {node_data?.node?.name}{" "}
          </div>
          <div className="flex-grow"></div>
        </div>
        <p className="text-xs font-extralight truncate">
          {node_data?.node?.description}
        </p>
        {isExpanded && (
          <>
            <div className={"px-2 py-2"}>
              <div className="grid grid-cols-2">
                <div className="w-full">
                  <span className="font-light text-sm ml-2"> Args </span>
                  <div className="grid grid-cols-1">
                    {node_data?.node?.args
                      ?.filter(notEmpty)
                      .map((arg, index) => {
                        let instream = data.instream[0]?.find(
                          (s) => s?.key === arg?.key
                        );

                        let inarg = globals?.find((s) =>
                          s?.toKeys.includes(globalArgKey(id, arg?.key))
                        );

                        return (
                          <div
                            key={index}
                            className={`border m-1 py-0 px-1 rounded  ${
                              instream && !inarg
                                ? "text-gray-800 bg-gray-200 border-gray-200"
                                : "text-gray-200 bg-gray-800 border-gray-900"
                            } ${inarg ? "bg-pink-500" : "bg-gray-800"}`}
                            data-tip={`${arg?.description}`}
                            data-for={"tooltip_special" + id}
                          >
                            {" "}
                            <div className="flex flex-inline">
                              <span
                                className="flex text-xs my-auto mr-1"
                                onClick={() => rotateArg(arg)}
                              >
                                {instream ? <AiOutlineArrowRight /> : " "}
                              </span>{" "}
                              <div
                                className="flex-grow"
                                onClick={() => rotateArg(arg)}
                              >
                                {arg?.key}
                              </div>
                              {!instream && (
                                <div
                                  className="text-xs my-auto ml-1"
                                  onClick={() => setArg(arg)}
                                >
                                  {inarg ? (
                                    <AiOutlineGlobal />
                                  ) : (
                                    <AiOutlineArrowUp />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
                <div className="w-full">
                  <span className="font-light text-sm"> Returns </span>
                  <div className="grid grid-cols-1">
                    {node_data?.node?.returns
                      ?.filter(notEmpty)
                      .map((re, index) => {
                        let instream = data.outstream[0]?.find(
                          (s) => s?.key === re?.key
                        );

                        return (
                          <div
                            key={index}
                            className={`border m-1 py-0 px-1 rounded  ${
                              instream
                                ? "text-gray-800 bg-gray-200 border-gray-200"
                                : "text-gray-200 bg-gray-800 border-gray-900"
                            } `}
                            data-tip={`${re?.description}`}
                            data-for={"tooltip_special" + id}
                            onClick={() => rotateReturn(re)}
                          >
                            <div className="flex flex-inline">
                              <span className="flex my-auto">
                                {re?.label || re.key}
                              </span>{" "}
                              <div className="flex-grow"></div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </NodeEditLayout>
    );
  }
);
