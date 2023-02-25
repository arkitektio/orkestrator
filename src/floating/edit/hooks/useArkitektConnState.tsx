import { useEffect, useState } from "react";
import { ReactFlowState, useStore } from "reactflow";
import { StreamKind } from "../../../fluss/api/graphql";
import { ConnState, FlowNode } from "../../types";
import { handle_to_index } from "../logic/connect";

const isTargetSelector = (state: ReactFlowState) => state.connectionNodeId;

export const useArkitektConnState = (id: string, nodes: FlowNode[]) => {
  const [conState, setConState] = useState<ConnState>({
    isConnecting: false,
    isConnectable: false,
    error: undefined,
  });

  const connectionNodeId = useStore(isTargetSelector);
  const connectionHandleId = useStore((state) => state.connectionHandleId);

  useEffect(() => {
    if (connectionNodeId && connectionNodeId != id) {
      let inNode = nodes.find((n: FlowNode) => n.id === connectionNodeId);
      if (inNode?.data.__typename == "ArgNode") {
        setConState({
          isConnectable: true,
          isConnecting: true,
          error: undefined,
        });
        return;
      }

      let selfNode = nodes.find((n: FlowNode) => n.id === id);

      let outstream = inNode?.data.outstream.at(
        handle_to_index(connectionHandleId)
      );

      let instream = selfNode?.data.instream.at(0);

      console.log(instream, outstream);
      if (!instream || !outstream) {
        setConState({
          isConnectable: false,
          isConnecting: true,
          error: "Incompatible length of stream",
        });
        return;
      }

      if (instream.length != outstream.length) {
        setConState({
          isConnectable: false,
          isConnecting: true,
          error: "Incompatible length of stream",
        });
        return;
      }

      for (let i = 0; i < instream.length; i++) {
        if (instream?.at(i)?.kind != outstream?.at(i)?.kind) {
          if (outstream.at(i)?.kind == StreamKind.List) {
            if (outstream.at(i)?.child?.kind == instream.at(i)?.kind) {
              if (outstream.at(i)?.child?.identifier) {
                if (
                  outstream.at(i)?.child?.identifier !=
                  instream.at(i)?.identifier
                ) {
                  setConState({
                    isConnectable: false,
                    isConnecting: true,
                    error: `Stream ${i} expects identifier ${
                      instream.at(i)?.identifier
                    }`,
                  });
                  return;
                }
              }

              setConState({
                isConnectable: false,
                isConnecting: true,
                error: `This stream expects a single input of ${
                  instream.at(i)?.identifier
                } but would receive a list. Please transform the list into a single value before (e.g. by using the "first" or "chunk" node)`,
              });
              return;
            }
          }
          setConState({
            isConnectable: false,
            isConnecting: true,
            error: `Incompatible kind of stream on element ${i}`,
          });
          return;
        }
        if (instream.at(i)?.identifier) {
          if (instream.at(i)?.identifier != outstream.at(i)?.identifier) {
            setConState({
              isConnectable: false,
              isConnecting: true,
              error: `Stream ${i} expects identifier ${
                instream.at(i)?.identifier
              }`,
            });
            return;
          }
        }
      }

      setConState({
        isConnectable: true,
        isConnecting: true,
      });
      return;
    }

    setConState({
      isConnectable: true,
      isConnecting: false,
    });
  }, [connectionNodeId, connectionHandleId, nodes]);

  return conState;
};
