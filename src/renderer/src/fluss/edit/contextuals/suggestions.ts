/**
 * Pure builders for the reactive-node suggestions each contextual offers.
 * They only depend on the live ports handed in, so panels `useMemo` them.
 */
import { FlussArgPortFragment, ReactiveImplementation } from "@/fluss/api/graphql";
import { GeneralPort, PortKind, ReactiveNodeSuggestions, RelativePosition, StreamPort } from "@/fluss/types";
import { listPortToSingle, reactiveFlowNode } from "@/fluss/utils";
import { allandone, generateAllMappings } from "./mappings";

const byTitle = (nodes: ReactiveNodeSuggestions[], search: string | undefined) =>
  search ? nodes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase())) : nodes;

const isStructuralMatch = (a: GeneralPort | undefined, b: GeneralPort | undefined) =>
  !!a && !!b && a.kind === b.kind && (a.kind !== PortKind.Structure || a.identifier === b.identifier);

const combineOptions = [
  { title: "Zip", description: "Zip multiple streams into one", implementation: ReactiveImplementation.Zip },
  {
    title: "WithLatest",
    description: "Combine the latest of stream a with the latest of stream b",
    implementation: ReactiveImplementation.Withlatest,
  },
];

const bufferOptions = [
  { title: "Buffer Count", description: "Buffer the count stream", implementation: ReactiveImplementation.BufferCount, constantsMap: { count: 1 } },
  { title: "BufferComplete", description: "Buffer the stream until complete", implementation: ReactiveImplementation.BufferComplete, constantsMap: {} },
  { title: "BufferUntil", description: "Buffer the stream until a condition is met", implementation: ReactiveImplementation.BufferUntil, constantsMap: {} },
];

/** Suggestions when the pane is clicked with nothing selected. */
export const clickSuggestions = (search: string | undefined): ReactiveNodeSuggestions[] => {
  if (!search) return [];
  const nodes: ReactiveNodeSuggestions[] = [];
  const asInt = parseInt(search);
  if (!isNaN(asInt)) {
    nodes.push({
      node: reactiveFlowNode({
        title: "Just",
        description: "Just an Int",
        ins: [[]],
        constantsMap: { value: asInt },
        outs: [[{ description: "Just an Int", key: "the_int", kind: PortKind.Int, nullable: false, __typename: "ReturnPort" }]],
        implementation: ReactiveImplementation.Just,
      }),
      title: `Just ${search} (Int)`,
      description: "Just an Int",
    });
  }
  nodes.push({
    node: reactiveFlowNode({
      title: "Just",
      description: "Just a String",
      ins: [[]],
      constantsMap: { value: search },
      outs: [[{ __typename: "ReturnPort", nullable: false, description: "Just a String", key: "string", kind: PortKind.String }]],
      implementation: ReactiveImplementation.Just,
    }),
    title: `Just ${search} (String)`,
    description: `Create the string ${search} on invocation`,
  });
  return nodes;
};

/** Suggestions when a source handle is dropped on the pane (a target is needed). */
export const dropSuggestions = (
  ports: readonly StreamPort[] | undefined,
  relativePosition: RelativePosition,
  search?: string,
): ReactiveNodeSuggestions[] => {
  if (!ports) return [];
  const nodes: ReactiveNodeSuggestions[] = [];
  const stream = [...ports];

  if (stream.length > 0 && stream.every((port) => port.kind === PortKind.List)) {
    nodes.push({
      node: reactiveFlowNode({
        title: "Chunk",
        description: "Transforms a stream into an item of chunks",
        ins: [stream],
        outs: [stream.map((p) => listPortToSingle(p as FlussArgPortFragment, "Chunked" + p.key))],
        implementation: ReactiveImplementation.Chunk,
      }),
      title: "Chunk",
      description: "Transforms a stream into an item of chunks",
    });
  }

  if (stream.length > 1) {
    stream.forEach((selected, i) => {
      nodes.push({
        node: reactiveFlowNode({
          title: "Only",
          description: "Selects one item of the stream",
          ins: [stream],
          constantsMap: { index: i },
          outs: [[selected]],
          implementation: ReactiveImplementation.Select,
        }),
        title: `Only ${selected.key}`,
        description: "Selects one item of the stream",
      });
    });
  }

  nodes.push({
    node: reactiveFlowNode({
      title: "Zip",
      description: "Zips this stream with another one",
      ins: relativePosition == "topleft" || relativePosition == "topright" ? [[], stream] : [stream, []],
      outs: [stream],
      implementation: ReactiveImplementation.Zip,
    }),
    title: "Zip with ...",
    description: "Zips this stream with another one",
  });

  return byTitle(nodes, search);
};

/** Suggestions when connecting two nodes whose streams don't match. */
export const connectSuggestions = (
  leftPorts: readonly StreamPort[] | undefined,
  rightPorts: readonly StreamPort[] | undefined,
  search?: string,
): ReactiveNodeSuggestions[] => {
  if (!leftPorts || !rightPorts) return [];
  const left = [...leftPorts];
  const right = [...rightPorts];
  const nodes: ReactiveNodeSuggestions[] = [];

  if (left.length == 0 && right.length >= 1) {
    nodes.push({
      node: reactiveFlowNode({ title: "Gate", description: "Gate the signal", ins: [left], outs: [right], implementation: ReactiveImplementation.Gate }),
      title: "Gate",
      description: "Gates the stream (only lets it through if the gate is open)",
    });
  }

  if (left.length > 0 && left.length < right.length) {
    const intersection = left.filter((a) => right.find((b) => isStructuralMatch(a, b)));
    if (intersection.length > 0) {
      for (const option of combineOptions) {
        nodes.push({
          node: reactiveFlowNode({ title: option.title, description: option.description, ins: [left], outs: [right], implementation: option.implementation }),
          title: option.title,
          description: option.description,
        });
      }
    }
  }

  if (left.length == 1 && left[0].kind == PortKind.List && isStructuralMatch(left[0].children?.at(0), right.at(0))) {
    nodes.push({
      node: reactiveFlowNode({ title: "Chunk", description: "Chunk the stream", ins: [left], outs: [right], implementation: ReactiveImplementation.Chunk }),
      title: "Chunk",
      description: "Chunk the stream",
    });
  }

  if (right.length == 1 && right[0].kind == PortKind.List && isStructuralMatch(right[0].children?.at(0), left.at(0))) {
    for (const option of bufferOptions) {
      nodes.push({
        node: reactiveFlowNode({ title: option.title, description: option.description, ins: [left], constantsMap: option.constantsMap, outs: [right], implementation: option.implementation }),
        title: option.title,
        description: option.description,
      });
    }
  }

  if (allandone(left, right, (port) => port.kind === PortKind.Float)) {
    nodes.push({
      node: reactiveFlowNode({
        title: "Round",
        description: "Round an Float to an Int",
        ins: [left],
        outs: [right.map((p) => ({ ...p, key: "Rounded" + p.key, kind: PortKind.Int }))],
        implementation: ReactiveImplementation.ToList,
      }),
      title: "Round",
      description: "Round an Float to an Int",
    });
  }

  if (right.length == 0) {
    nodes.push({
      node: reactiveFlowNode({ title: "Omit", description: "Discard the stream and just send an event", ins: [left], outs: [[]], implementation: ReactiveImplementation.Omit }),
      title: "Omit",
      description: "Discard the stream and just send an event",
    });
  }

  if (left.length > right.length && right.length == 1) {
    for (const port of left) {
      nodes.push({
        node: reactiveFlowNode({ title: "Select " + port.key, description: "Select an item of the stream", ins: [left], outs: [[port]], implementation: ReactiveImplementation.Select }),
        title: "Select " + port.key,
        description: "Select an item of the stream",
      });
    }
  }

  for (const mapping of generateAllMappings(left, right)) {
    nodes.push({
      node: reactiveFlowNode({ title: "Reorder", description: "Reorder the stream", ins: [left], constantsMap: { map: mapping }, outs: [right], implementation: ReactiveImplementation.Reorder }),
      title: "Reorder",
      description: "Reorder the stream",
    });
  }

  return byTitle(nodes, search);
};

/** Suggestions when an existing edge is clicked (insert a transform). */
export const edgeSuggestions = (
  leftPorts: readonly StreamPort[] | undefined,
  rightPorts: readonly StreamPort[] | undefined,
  search: string = "",
): ReactiveNodeSuggestions[] => {
  if (!leftPorts || !rightPorts) return [];
  const left = [...leftPorts];
  const right = [...rightPorts];
  const nodes: ReactiveNodeSuggestions[] = [];

  if (allandone(left, right, (port) => port.kind === PortKind.Float)) {
    nodes.push({
      node: reactiveFlowNode({
        title: "Round",
        description: "Round an Float to an Int",
        ins: [left],
        outs: [right.map((p) => ({ ...p, key: "Rounded" + p.key, kind: PortKind.Int }))],
        implementation: ReactiveImplementation.ToList,
      }),
      title: "Round",
      description: "Round an Float to an Int",
    });
  }

  const asInt = parseInt(search);
  if (!isNaN(asInt) && allandone(left, right, (port) => port.kind === PortKind.Int || port.kind === PortKind.Float)) {
    nodes.push({
      node: reactiveFlowNode({
        title: "Add",
        description: "Add an Int",
        ins: [left],
        constantsMap: { value: asInt },
        outs: [right.map((p) => ({ ...p, key: "Added" + p.key, kind: PortKind.Int }))],
        implementation: ReactiveImplementation.Add,
      }),
      title: `Add ${search} (Int)`,
      description: "Add a number",
    });
  }

  if (right.length == 0) {
    nodes.push({
      node: reactiveFlowNode({ title: "Omit", description: "Discard the stream and just send an event", ins: [left], outs: [[]], implementation: ReactiveImplementation.Omit }),
      title: "Omit",
      description: "Discard the stream and just send an event",
    });
  }

  for (const mapping of generateAllMappings(left, right)) {
    nodes.push({
      node: reactiveFlowNode({ title: "Reorder", description: "Reorder the stream", ins: [left], constantsMap: { map: mapping }, outs: [right], implementation: ReactiveImplementation.Reorder }),
      title: "Reorder",
      description: "Reorder the stream",
    });
  }

  return nodes;
};
