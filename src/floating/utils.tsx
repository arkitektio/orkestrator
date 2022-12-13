import { Maybe } from "graphql/jsutils/Maybe";
import {
  ArgPortFragment,
  ChildPortFragment,
  PortKind,
  ReturnPortFragment,
} from "../rekuest/api/graphql";
import {
  EdgeInput,
  FlowFragment,
  NodeInput,
  StreamItem,
  StreamItemChild,
  StreamKind,
} from "../fluss/api/graphql";
import {
  ArkitektNodeData,
  FlowEdge,
  FlowNode,
  ReactiveNodeData,
} from "./types";

export const port_to_type = (
  port: {
    kind?: PortKind | null | undefined;
    identifier?: string | null;
  } | null
) => {
  if (!port?.kind) return StreamKind.Unset;
  return port?.kind as unknown as StreamKind;
};

export const childport_to_stream = (
  port: ChildPortFragment
): StreamItemChild => ({
  kind: (port?.kind as unknown as StreamKind) || StreamKind.Unset,
  identifier: port?.identifier,
});

export const port_to_stream = (
  port: Maybe<ArgPortFragment> | Maybe<ReturnPortFragment>
): StreamItem => {
  return {
    key: port?.key || "unknown",
    kind: (port?.kind as unknown as StreamKind) || StreamKind.Unset,
    identifier: port?.identifier,
    nullable: port?.nullable || false,
    child: port?.child && childport_to_stream(port?.child),
  };
};

export function notEmpty<TValue>(
  value: TValue | null | undefined
): value is TValue {
  if (value === null || value === undefined) return false;
  return true;
}

const reg = /\s*,["']__typename["']\s*:\s*["'][\d\w]*["']\s*?/g;
const reg2 = /\s*{["']__typename["']\s*:\s*["'][\d\w]*["']\s*,?/g;

export function noTypename<T extends { [key: string]: any }>(obj: T): T {
  console.log(JSON.stringify(obj));
  const str = JSON.stringify(obj).replace(reg, "").replace(reg2, "{");
  console.log(str);
  let z = JSON.parse(str);
  console.log(z);
  return z;
}

export const nodes_to_flownodes = (
  nodes: FlowFragment["graph"]["nodes"]
): FlowNode[] => {
  const nodes_ =
    nodes
      ?.map((node) => {
        if (node) {
          const { id, position, __typename, ...rest } = node;
          const node_: FlowNode = {
            type: __typename,
            id: id,
            position: position,
            data: {
              __typename: __typename,
              ...rest,
            },
            dragHandle: ".custom-drag-handle",
          };
          return node_;
        }
        return undefined;
      })
      .filter(notEmpty) || [];

  return nodes_;
};

export const edges_to_flowedges = (
  edges: FlowFragment["graph"]["edges"]
): FlowEdge[] => {
  const flowedges =
    edges
      ?.map((edge) => {
        if (edge) {
          const {
            id,
            source,
            sourceHandle,
            target,
            targetHandle,
            __typename,
            ...rest
          } = edge;
          const flowedge: FlowEdge = {
            id,
            type: __typename,
            source,
            sourceHandle,
            target,
            targetHandle,
            data: {
              __typename: __typename,
              ...rest,
            },
          };
          return flowedge;
        }
        return undefined;
      })
      .filter(notEmpty) || [];

  return flowedges;
};

export const flownodes_to_nodes = (nodes: FlowNode[]): NodeInput[] => {
  const nodes_ =
    nodes
      ?.map((node) => {
        if (node) {
          const {
            id,
            position,
            type,
            data: { outstream, constream, instream, ...rest },
          } = node;
          const node_: NodeInput = {
            outstream: outstream?.map((s) =>
              s ? s.filter(notEmpty).map(noTypename) : []
            ) || [[]], //InputType do not have a __typename
            constream: constream?.map((s) =>
              s ? s.filter(notEmpty).map(noTypename) : []
            ) || [[]], //
            instream: instream?.map((s) =>
              s ? s.filter(notEmpty).map(noTypename) : []
            ) || [[]], //
            id,
            position: { x: position.x, y: position.y },
            typename: type || "Fake type",
            name: (rest as any).name,
            hash: (rest as any).hash,
            implementation: (rest as any).implementation,
            kind: (rest as any).kind,
            defaults: (rest as any).defaults,
            mapStrategy: (rest as any).mapStrategy,
            allowLocal: (rest as any).allowLocal,
            reserveParams: (rest as any).reserveParams
              ? noTypename((rest as any).reserveParams)
              : undefined,
          };
          return node_;
        }
      })
      .filter(notEmpty) || [];

  return nodes_ || [];
};

export const flowedges_to_edges = (flowedges: FlowEdge[]): EdgeInput[] => {
  const edges =
    flowedges
      ?.map((edge) => {
        console.log(edge);
        if (edge) {
          const { id, source, sourceHandle, target, targetHandle, type, data } =
            edge;
          const input: EdgeInput = {
            id,
            typename: type || "Fake type",
            source,
            sourceHandle: sourceHandle || "returns",
            target,
            targetHandle: targetHandle || "args",
            stream: data?.stream.filter(notEmpty).map(noTypename) || [],
          };
          return input;
        }
        return undefined;
      })
      .filter(notEmpty) || [];

  return edges;
};
