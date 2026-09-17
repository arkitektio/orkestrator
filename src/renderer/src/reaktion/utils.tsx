import {
  ArgPortInput,
  AssignWidgetInput,
  EffectInput,
  FlowFragment,
  FlussArgChildPortFragment,
  FlussArgPortFragment,
  FlussAssignWidgetFragment,
  FlussPortEffectFragment,
  FlussReturnChildPortFragment,
  FlussReturnPortFragment,
  FlussReturnWidgetFragment,
  GlobalArgInput,
  GraphNodeFragment,
  GraphNodeKind,
  PortKind,
  ReactiveImplementation,
  ReactiveNodeFragment,
  ReactiveTemplateFragment,
  RekuestMapActionNodeFragment,
  ReturnPortInput,
  ReturnWidgetInput,
  StreamItemInput,
  AssignWidgetKind,
  ReturnWidgetKind,
  EffectKind,
} from "@/reaktion/api/graphql";
import { XYPosition } from "@xyflow/react";
import {
  ActionDemandInput,
  ActionKind,
  ArgPortInput as RekuestArgPortInput,
  DefinitionInput,
  AgentDependencyInput,
  ReturnPortInput as RekuestReturnPortInput,
} from "@/rekuest/api/graphql";
import { portToDefaults } from "@/rekuest/widgets/utils";
import { v4 as uuidv4 } from "uuid";
import {
  ActionFragment,
  EdgeFragement,
  EdgeInput,
  FlowEdge,
  FlowNode,
  FlowNodeData,
  GeneralPort,
  GlobalFragment,
  GlobalInput,
  NodeInput,
  StreamItemFragment,
  StreamPort,
} from "./types";


export const globalArgKey = (id: string, key: string) => {
  return `${id}.${key}`;
};

export function notEmpty<TValue>(
  value: TValue | null | undefined,
): value is TValue {
  if (value === null || value === undefined) return false;
  return true;
}

export function keyInObject(
  key: string,
  obj: any,
): obj is {
  [key: string]: any;
} {
  return obj && key in obj;
}

// --- Fluss port -> input converters -------------------------------------------
// Ports were split into ArgPort (inputs) and ReturnPort (outputs). The flow graph
// uses the fluss fragments, so the flow owns its own fluss-typed converters rather
// than feeding fluss fragments into rekuest's (the widget sub-unions differ and the
// kind enums are nominally distinct between the two generated modules).

const flussAssignWidgetKindMap: Record<
  NonNullable<FlussAssignWidgetFragment["__typename"]>,
  AssignWidgetKind
> = {
  ChoiceAssignWidget: AssignWidgetKind.Choice,
  CustomAssignWidget: AssignWidgetKind.Custom,
  ProxyWidget: AssignWidgetKind.Proxy,
  SearchAssignWidget: AssignWidgetKind.Search,
  SliderAssignWidget: AssignWidgetKind.Slider,
  StateChoiceAssignWidget: AssignWidgetKind.StateChoice,
  StringAssignWidget: AssignWidgetKind.String,
};

const flussReturnWidgetKindMap: Record<
  NonNullable<FlussReturnWidgetFragment["__typename"]>,
  ReturnWidgetKind
> = {
  ChoiceReturnWidget: ReturnWidgetKind.Choice,
  CustomReturnWidget: ReturnWidgetKind.Custom,
};

const flussEffectKindMap: Record<
  NonNullable<FlussPortEffectFragment["__typename"]>,
  EffectKind
> = {
  CustomEffect: EffectKind.Custom,
  HideEffect: EffectKind.Hide,
  MessageEffect: EffectKind.Message,
};

// Choices live on the port now, not on the widget, so a widget round-trips by
// dropping `__typename` at every depth (`fallback`, `filters`, `props`,
// `stateCall`, `stateAccessors` are all nested output objects).
const flussAssignWidgetToInput = (
  widget: FlussAssignWidgetFragment,
): AssignWidgetInput => {
  const { __typename, ...rest } = stripTypenames(widget);
  return {
    ...rest,
    kind: flussAssignWidgetKindMap[widget.__typename],
  } as AssignWidgetInput;
};

const flussReturnWidgetToInput = (
  widget: FlussReturnWidgetFragment,
): ReturnWidgetInput => {
  const { __typename, ...rest } = stripTypenames(widget);
  return {
    ...rest,
    kind: flussReturnWidgetKindMap[widget.__typename],
  } as ReturnWidgetInput;
};

/**
 * Recursively drop `__typename` markers so a fetched object can be sent back
 * as its input type. Used for `call` (a nested `UtilCall` / `ActionArgument`
 * tree whose input and output field names otherwise match).
 */
const stripTypenames = <T,>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map(stripTypenames) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (key === "__typename") continue;
      out[key] = stripTypenames(entry);
    }
    return out as T;
  }
  return value;
};

const flussPortEffectToInput = (
  effect: FlussPortEffectFragment,
): EffectInput => {
  const { __typename, call, ...rest } = effect;
  return {
    ...rest,
    call: stripTypenames(call),
    kind: flussEffectKindMap[__typename],
  };
};

// A port can sit on either side of a node regardless of its fragment type:
// reactive/transform nodes take a source's *return* ports as their *ins* (and
// vice versa). The input types differ per side (`default`/`validators`/
// `requires`/assign widget are arg-only; `provides`/return widget are
// return-only), so the converters pick exactly the target input's fields and
// drop what the other side carries instead of spreading the fragment.
type AnyFlussPortLike = {
  __typename?: string;
  key: string;
  kind: PortKind;
  label?: string | null;
  nullable?: boolean;
  description?: string | null;
  identifier?: string | null;
  referenceUnit?: string | null;
  proposedUnits?: string[] | null;
  dimension?: string | null;
  default?: unknown;
  effects?: FlussPortEffectFragment[] | null;
  children?: AnyFlussPortLike[] | null;
  widget?: (FlussAssignWidgetFragment | FlussReturnWidgetFragment) | null;
  choices?: ({ __typename?: string } & Record<string, unknown>)[] | null;
  validators?: ({ __typename?: string; call?: unknown } & Record<string, unknown>)[] | null;
  requires?: ({ __typename?: string } & Record<string, unknown>)[] | null;
  provides?: ({ __typename?: string } & Record<string, unknown>)[] | null;
};

const pickCommonPortFields = (port: AnyFlussPortLike) => ({
  key: port.key,
  kind: port.kind,
  label: port.label ?? undefined,
  nullable: port.nullable ?? false,
  description: port.description ?? undefined,
  identifier: port.identifier ?? undefined,
  referenceUnit: port.referenceUnit ?? undefined,
  proposedUnits: port.proposedUnits ?? undefined,
  dimension: port.dimension ?? undefined,
  effects: port.effects?.map(flussPortEffectToInput),
  choices: port.choices?.map((c) => stripTypenames(c)) as ArgPortInput["choices"],
});

const isAssignWidget = (
  widget: FlussAssignWidgetFragment | FlussReturnWidgetFragment,
): widget is FlussAssignWidgetFragment =>
  !!widget.__typename && widget.__typename in flussAssignWidgetKindMap;

const isReturnWidget = (
  widget: FlussAssignWidgetFragment | FlussReturnWidgetFragment,
): widget is FlussReturnWidgetFragment =>
  !!widget.__typename && widget.__typename in flussReturnWidgetKindMap;

export const flussArgPortToInput = (
  port: FlussArgPortFragment | FlussArgChildPortFragment | FlussReturnPortFragment | FlussReturnChildPortFragment,
): ArgPortInput => {
  const p = port as unknown as AnyFlussPortLike;
  const argSide = p.__typename !== "ReturnPort";
  return {
    ...pickCommonPortFields(p),
    children: p.children?.map((c) => flussArgPortToInput(c as FlussArgChildPortFragment)),
    widget: p.widget && isAssignWidget(p.widget) ? flussAssignWidgetToInput(p.widget) : undefined,
    default: argSide ? (p.default as ArgPortInput["default"]) : undefined,
    validators: argSide
      ? p.validators?.map(({ __typename: _t, call, ...v }) => ({
          ...(v as object),
          call: stripTypenames(call),
        })) as ArgPortInput["validators"]
      : undefined,
    requires: argSide
      ? (p.requires?.map((r) => stripTypenames(r)) as ArgPortInput["requires"])
      : undefined,
  };
};

/** @deprecated use `flussArgPortToInput`; kept for callers that convert child ports explicitly. */
export const flussArgChildToInput = (port: FlussArgChildPortFragment): ArgPortInput =>
  flussArgPortToInput(port);

export const flussReturnPortToInput = (
  port: FlussReturnPortFragment | FlussReturnChildPortFragment | FlussArgPortFragment | FlussArgChildPortFragment,
): ReturnPortInput => {
  const p = port as unknown as AnyFlussPortLike;
  const returnSide = p.__typename !== "ArgPort";
  return {
    ...pickCommonPortFields(p),
    children: p.children?.map((c) => flussReturnPortToInput(c as FlussReturnChildPortFragment)),
    widget: p.widget && isReturnWidget(p.widget) ? flussReturnWidgetToInput(p.widget) : undefined,
    provides: returnSide
      ? (p.provides?.map((r) => stripTypenames(r)) as ReturnPortInput["provides"])
      : undefined,
  };
};

/** @deprecated use `flussReturnPortToInput`; kept for callers that convert child ports explicitly. */
export const flussReturnChildToInput = (port: FlussReturnChildPortFragment): ReturnPortInput =>
  flussReturnPortToInput(port);

// For building a rekuest action DefinitionInput from a flow's IO nodes: the flow's
// ArgNode emits its values as node *outs* (ReturnPort) which are semantically the
// action's input args, and the ReturnNode consumes via node *ins* (ArgPort) which
// are the action's returns. Only the structural signature matters here, so widgets/
// validators are dropped. The signatures are typed as *rekuest* inputs because
// that is where they go (a rekuest DefinitionInput); the widget sub-unions of the
// two services have drifted apart, so fluss inputs are no longer assignable as-is.

type AnyFlussChild = FlussArgChildPortFragment | FlussReturnChildPortFragment;
type AnyFlussPort = FlussArgPortFragment | FlussReturnPortFragment;

const flowChildToArgSignature = (c: AnyFlussChild): RekuestArgPortInput => ({
  key: c.key,
  kind: c.kind,
  identifier: c.identifier,
  nullable: c.nullable,
  children: c.children?.map((cc) => flowChildToArgSignature(cc as AnyFlussChild)),
});

const flowChildToReturnSignature = (c: AnyFlussChild): RekuestReturnPortInput => ({
  key: c.key,
  kind: c.kind,
  identifier: c.identifier,
  nullable: c.nullable,
  children: c.children?.map((cc) => flowChildToReturnSignature(cc as AnyFlussChild)),
});

const flowPortToArgSignature = (port: AnyFlussPort): RekuestArgPortInput => ({
  key: port.key,
  label: port.label,
  nullable: port.nullable,
  description: port.description,
  kind: port.kind,
  identifier: port.identifier,
  // `default` is an ArgPort-only field; a ReturnPort never carries one.
  default: "default" in port ? port.default : undefined,
  choices: port.choices?.map(({ __typename, ...c }) => c),
  children: port.children?.map((c) => flowChildToArgSignature(c as AnyFlussChild)),
});

const flowPortToReturnSignature = (port: AnyFlussPort): RekuestReturnPortInput => ({
  key: port.key,
  label: port.label,
  nullable: port.nullable,
  description: port.description,
  kind: port.kind,
  identifier: port.identifier,
  choices: port.choices?.map(({ __typename, ...c }) => c),
  children: port.children?.map((c) => flowChildToReturnSignature(c as AnyFlussChild)),
});

export const nodes_to_flownodes = (nodes: ActionFragment[]): FlowNode[] => {

  const nodes_ =
    nodes
      ?.map((node) => {
        if (node) {
          // `parentNode` is React Flow's `parentId`; it must not stay in `data`
          // or it would shadow a later reparent on save (see flowNodeToInput).
          const { id, position, __typename, parentNode, ...rest } = node;
          const node_: FlowNode = {
            type: __typename,
            id: id,
            position: { x: position.x, y: position.y },
            data: { ...rest },
            dragHandle: ".custom-drag-handle",
            parentId: parentNode ? parentNode : undefined,
            extent: parentNode ? "parent" : undefined,
          };
          return node_;
        }
        return undefined;
      })
      .filter(notEmpty) || [];

  return nodes_;
};

export const edges_to_flowedges = (edges: EdgeFragement[]): FlowEdge[] => {
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
            data: rest,
          };
          return flowedge;
        }
        return undefined;
      })
      .filter(notEmpty) || [];


  return flowedges;
};

export const flowNodeToInput = (
  node: FlowNode<GraphNodeFragment>,
): NodeInput => {
  const {
    id,
    position,
    parentId,
    data: { outs, constants, ins, voids, ...rest },
  } = node;
  try {
    // Only schema fields may reach the mutation; the editor decorates node
    // data with client-only keys (`extras`, legacy `app`/`binds`, a stale
    // `parentNode` from older saves).
    const {
      extras: _extras,
      app: _app,
      binds: _binds,
      parentNode: _parentNode,
      __typename: _typename,
      ...fields
    } = rest as typeof rest & {
      extras?: unknown;
      app?: unknown;
      binds?: unknown;
      parentNode?: unknown;
      __typename?: unknown;
    };

    const node_: NodeInput = {
      ...fields,
      ins: ins && ins.map((s) => s.map(flussArgPortToInput)),
      outs: outs && outs.map((s) => s.map(flussReturnPortToInput)),
      constants: constants && constants.map(flussArgPortToInput),
      voids: voids && voids.map(flussArgPortToInput),
      id,
      position: { x: position.x, y: position.y },
      // The live React Flow parent wins over anything left in `data`.
      parentNode: parentId ? parentId : undefined,
    };

    return node_;
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export const globalToInput = (node: GlobalFragment): GlobalArgInput => {
  const { __typename, port, ...rest } = node;
  return { ...rest, port: flussArgPortToInput(port) };
};

export const streamItemToInput = (
  node: StreamItemFragment,
): StreamItemInput => {
  const { __typename, ...rest } = node;
  return { ...rest };
};

export const flowEdgeToInput = (edge: FlowEdge): EdgeInput => {
  const { id, source, sourceHandle, target, targetHandle, data } = edge;
  if (!data) throw new Error("No data set");
  const { stream } = data;
  if (!sourceHandle || !targetHandle) throw new Error("No handle specified");
  const edge_: EdgeInput = {
    id: id,
    source: source,
    sourceHandle: sourceHandle,
    target: target,
    targetHandle: targetHandle,
    stream: stream?.map(streamItemToInput) || [],
    kind: data.kind,
  };

  return edge_;
};

export const flownodes_to_inputnodes = (nodes: FlowNode[]): NodeInput[] => {
  return nodes.map(flowNodeToInput);
};

export const flowedges_to_inputedges = (flowedges: FlowEdge[]): EdgeInput[] => {
  return flowedges.map(flowEdgeToInput);
};

export const globals_to_inputglobals = (
  globals: GlobalFragment[],
): GlobalInput[] => {
  return globals.map(globalToInput);
};

export const reactiveTemplateToFlowNode = (
  node: ReactiveTemplateFragment,
  position: { x: number; y: number },
): FlowNode<ReactiveNodeFragment> => {
  const nodeId = "reactive-" + uuidv4();

  const node_: FlowNode<ReactiveNodeFragment> = {
    id: nodeId,
    type: "ReactiveNode",
    dragHandle: ".custom-drag-handle",
    data: {
      ins: node.ins,
      implementation: node.implementation,
      outs: node.outs,
      voids: [],
      kind: GraphNodeKind.Reactive,
      constants: node.constants,
      constantsMap: portToDefaults(node.constants, {}),
      globalsMap: {},
      title: node?.title || "no-name",
      description: node.description || "",
    },
    position: position,
  };

  return node_;
};

// Builds a reactive transform/suggestion node. Reactive nodes route a stream from
// their ins (typed ArgPort) to their outs (typed ReturnPort), but the flow lets any
// port connect to any, so the incoming streams are arg/return-agnostic. The single
// cast here bridges that nominal gap for all the reactive-node builders.
export const reactiveFlowNode = (args: {
  title: string;
  description: string;
  implementation: ReactiveImplementation;
  ins: StreamPort[][];
  outs: StreamPort[][];
  constants?: FlussArgPortFragment[];
  constantsMap?: { [key: string]: any };
  position?: XYPosition;
  id?: string;
}): FlowNode<ReactiveNodeFragment> => ({
  id: args.id || nodeIdBuilder(),
  type: "ReactiveNode",
  position: args.position || { x: 0, y: 0 },
  data: {
    globalsMap: {},
    constantsMap: args.constantsMap || {},
    title: args.title,
    description: args.description,
    kind: GraphNodeKind.Reactive,
    ins: args.ins,
    outs: args.outs,
    voids: [],
    constants: args.constants || [],
    implementation: args.implementation,
  } as unknown as FlowNodeData<ReactiveNodeFragment>,
});

export const listPortToSingle = (
  port: FlussArgPortFragment,
  key: string,
): FlussArgPortFragment => {
  if (port.kind != PortKind.List) throw new Error("Port is not a list");
  const listChild = port.children?.at(0);
  if (!listChild) throw new Error("Port has no children");

  const { __typename, children, ...rest } = listChild;
  return {
    ...rest,
    key: key,
    __typename: "ArgPort",
    children: children as FlussArgChildPortFragment[] | undefined,
  };
};

export const singleToList = (port: FlussArgPortFragment): FlussArgPortFragment => {

  return {
    nullable: false,
    kind: PortKind.List,
    key: port.key,
    __typename: "ArgPort",
    children: [{ ...port, key: "0" }],
  };
};

export const nodeIdBuilder = () => {
  return uuidv4();
};

export const handleToStream = (handle: string | undefined | null) => {
  if (handle == undefined) return -1;
  const parts = handle.split("_");
  return parseInt(parts[parts.length - 1]);
};

export const portToReadble = (
  port: GeneralPort | undefined | null,
  withLocalDisclaimer: boolean,
): string => {
  if (!port) return "undefined";

  let answer = "";
  if (port.nullable) answer += "?";
  if (port.kind == PortKind.List) {
    answer +=
      "[ " +
      portToReadble(
        port.children?.at(0) as GeneralPort,
        withLocalDisclaimer,
      ) +
      " ]";
  }

  if (port.kind == PortKind.Dict) {
    answer +=
      "{ " +
      portToReadble(
        port.children?.at(0) as GeneralPort,
        withLocalDisclaimer,
      ) +
      " }";
  }

  if (port.kind == PortKind.Int) {
    answer += "int";
  }

  if (port.kind == PortKind.Float) {
    answer += "float";
  }

  if (port.kind == PortKind.String) {
    answer += "string";
  }

  if (port.kind == PortKind.Bool) {
    answer += "bool";
  }

  if (port.kind == PortKind.Union) {
    if (!port.children) throw new Error("Union has no variants");
    answer += port.children
      .map((p) => portToReadble(p as GeneralPort, withLocalDisclaimer))
      .join(" | ");
  }

  if (port.kind == PortKind.Structure) {
    answer += port.identifier;
  }

  if (port.kind == PortKind.Enum) {
    answer += port.identifier;
  }

  if (port.kind == PortKind.MemoryStructure) {
    answer += port.identifier;
  }

  return answer;
};

export const streamToReadable = (
  stream: GeneralPort[] | undefined  | null,
  withLocalDisclaimer?: boolean,
): string => {
  if (!stream) return "undefinedStream";
  return stream
    .map((p) => portToReadble(p, withLocalDisclaimer == true))
    .join(" | ");
};

export const streamToReactNode = (
  stream: GeneralPort[] | undefined,
  withLocalDisclaimer?: boolean,
) => {
  if (!stream)
    return <div className="text-red-400 stream-edge">undefinedStream</div>;
  return (
    <div className="flex flex-row flex-wrap stream-edge ">
      {stream.length == 0 ? (
        <div className="font-bold">Event</div>
      ) : (
        stream.map((p) => (
          <div className="flex-1" key={p.key}>
            {portToReadble(p, withLocalDisclaimer == true)}
          </div>
        ))
      )}
    </div>
  );
};





const rekuestNodeToActionDemand = (node: RekuestMapActionNodeFragment): ActionDemandInput => {
  return {
    hash: node.hash,
  }
}







export const flowToDefinition = (flow: FlowFragment): DefinitionInput => {
  // The ArgNode emits its values as node outs (ReturnPort) — these are the
  // action's input args. The ReturnNode consumes via node ins (ArgPort) — these
  // are the action's returns. fluss inputs are structurally identical to rekuest's.
  const args: RekuestArgPortInput[] =
    flow.graph?.nodes
      ?.find((arg) => arg.__typename == "ArgNode")
      ?.outs.at(0)
      ?.map(flowPortToArgSignature) || [];

  const kwargs: RekuestArgPortInput[] =
    flow.graph.globals?.map((arg) => flussArgPortToInput(arg.port)) || [];

  const returns: RekuestReturnPortInput[] =
    flow.graph?.nodes
      ?.find((arg) => arg.__typename == "ReturnNode")
      ?.ins.at(0)
      ?.map(flowPortToReturnSignature) || [];










  return {
    kind: ActionKind.Function,
    key: flow.id,
    version: "0.1",
    args: [...args, ...kwargs],
    returns: returns,
    name: flow.title,
    description: flow.description,
  };
};

export const flowToDependencies = (flow: FlowFragment): AgentDependencyInput[] => {
  const dependencies =
    flow.graph?.nodes
      ?.filter(
        (node) => node.__typename == "AgentSubFlowNode"
      )
      .map((node) => {

        const actionDefintions = flow.graph.nodes
          ?.filter((n) => n.parentNode === node.id && n.__typename === "RekuestMapActionNode")
          .map((n) => rekuestNodeToActionDemand(n as RekuestMapActionNodeFragment)) || [];


        return {
          key: node.id,
          app: node.appFilter,
          actionDemands: actionDefintions,
          autoResolvable: node.autoResolvable || false,

        } as AgentDependencyInput

        }) || [];

  return dependencies;
};
