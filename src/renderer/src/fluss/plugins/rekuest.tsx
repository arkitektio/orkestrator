import {
  ActionKind,
  FlussArgPortFragment,
  FlussReturnPortFragment,
  GraphNodeKind,
  MapStrategy,
  RekuestFilterActionNodeFragment,
  RekuestMapActionNodeFragment,
} from "@/fluss/api/graphql";
import {
  ConstantActionQuery,
  GraphNodeActionFragment
} from "@/rekuest/api/graphql";
import { portToDefaults } from "@/lib/ports/utils";
import { v4 as uuidv4 } from "uuid";
import { FlowNode } from "../types";

export const rekuestNodeToMapNode = (
  node: GraphNodeActionFragment,
  position: { x: number; y: number },
): FlowNode<RekuestMapActionNodeFragment> => {
  const nodeId = "ark-" + uuidv4();

  // The action's ports are rekuest fragments; the flow node holds the structurally
  // identical fluss fragments.
  const args = node.args as unknown as FlussArgPortFragment[];
  const returns = node.returns as unknown as FlussReturnPortFragment[];

  console.log(nodeId);
  const node_: FlowNode<RekuestMapActionNodeFragment> = {
    id: nodeId,
    type: "RekuestMapActionNode",
    dragHandle: ".custom-drag-handle",
    data: {
      ins: [
        args.filter((x) => !x?.nullable && x?.default == undefined), // by default, all nullable and default values are optional so not part of stream
      ],
      outs: [returns],
      voids: [],
      constants: args.filter(
        (x) => x?.nullable || x?.default != undefined,
      ),
      title: node?.name || "no-name",
      description: node.description || "",
      mapStrategy: MapStrategy.Map,
      allowLocalExecution: true,
      nextTimeout: 100000,
      retries: 3,
      retryDelay: 2000,
      hash: node.hash,
      kind: GraphNodeKind.Rekuest,
      globalsMap: {},
      constantsMap: portToDefaults(node.args, {}),
      actionKind: node.kind || ActionKind.Generator,
    },
    position: position,
  };

  return node_;
};

export const rekuestActionToMatchingNode = (
  node: ConstantActionQuery["action"],
  position: { x: number; y: number },
) => {
  if (node.protocols.find((p) => p.name == "predicate")) {
    return rekuestNodeToFilterNode(node, position);
  } else {
    return rekuestNodeToMapNode(node, position);
  }
};

export const rekuestNodeToFilterNode = (
  node: GraphNodeActionFragment,
  position: { x: number; y: number },
): FlowNode<RekuestFilterActionNodeFragment> => {
  const nodeId = "arkfilter-" + uuidv4();

  const args = node.args as unknown as FlussArgPortFragment[];

  console.log(nodeId);
  const node_: FlowNode<RekuestFilterActionNodeFragment> = {
    id: nodeId,
    type: "RekuestFilterActionNode",
    dragHandle: ".custom-drag-handle",
    data: {
      ins: [
        args.filter((x) => !x?.nullable && x?.default == undefined), // by default, all nullable and default values are optional so not part of stream
      ],
      outs: [
        args.filter((x) => !x?.nullable && x?.default == undefined),
        args.filter((x) => !x?.nullable && x?.default == undefined),
      ] as unknown as FlussReturnPortFragment[][], // filter passes its inputs straight through
      constants: args.filter(
        (x) => x?.nullable || x?.default != undefined,
      ),
      voids: [],
      title: node?.name || "no-name",
      description: node.description || "",
      mapStrategy: MapStrategy.Map,
      allowLocalExecution: true,
      nextTimeout: 100000,
      retries: 3,
      retryDelay: 2000,
      hash: node.hash,
      kind: GraphNodeKind.RekuestFilter,
      globalsMap: {},
      constantsMap: portToDefaults(node.args, {}),
      actionKind: node.kind || ActionKind.Function,
    },
    position: position,
  };

  return node_;
};
