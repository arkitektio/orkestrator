import { addEdge } from "reactflow";
import { PortFragment as ArkitektPortFragment } from "../../../rekuest/api/graphql";
import { PortFragment } from "../../../fluss/api/graphql";
import {
  ArgNodeFragment,
  ArkitektNodeFragment,
  ReactiveImplementationModelInput,
  StreamItem,
  StreamKind,
} from "../../../fluss/api/graphql";
import {
  ArgNodeData,
  ArkitektNodeData,
  CommonNode,
  ConnectionMap,
  Connector,
  FlowEdge,
  FlowNode,
  ReactiveNodeData,
  ReturnNodeData,
} from "../../types";
import { notEmpty } from "../../utils";

export const void_updater: Connector = ({ params, nodes, edges }) => {
  return {
    nodes: nodes,
    edges: edges,
    errors: [{ message: "Not Implemented yet" }],
  };
};

export const error_updater: Connector = ({ params, nodes, edges }) => {
  return { nodes: nodes, edges: edges };
};

export const error_builder: (message: string) => Connector = (message) => {
  return ({ params, nodes, edges }) => {
    return { errors: [{ message: message }] };
  };
};

export const handle_to_index: (handle: string | null | undefined) => number = (
  handle
) => {
  if (!handle) {
    throw new Error("Handle is null");
  }
  return parseInt(handle.split("_")[1]);
};

const arkport_to_port = (argport: ArkitektPortFragment): PortFragment => {
  return {
    key: argport?.key,
    kind: argport?.kind as unknown as StreamKind,
    // TODO: List of list are not supported yet
    child: argport?.child && {
      identifier: argport.child.identifier,
      kind: argport.child.kind as unknown as StreamKind,
      __typename: "PortChild",
      nullable: argport.child.nullable,
    },
    assignWidget: argport?.assignWidget && {
      ...argport?.assignWidget,
      __typename: "Widget",
      kind: argport.assignWidget?.__typename,
    },
    returnWidget: argport?.returnWidget && {
      // can be null but not kind unset
      ...argport?.returnWidget,
      __typename: "ReturnWidget",
      kind: argport.returnWidget?.__typename,
    },
    identifier: argport?.identifier,
    nullable: argport?.nullable,
  };
};

export const calculateWrongEdges = (
  edges: FlowEdge[],
  node: { id: string },
  new_instream: ((StreamItem | null | undefined)[] | null)[] | null,
  new_outstream: ((StreamItem | null | undefined)[] | null)[] | null
) => {
  let wrong_edges_out = edges
    .filter(notEmpty)
    .filter((e) => e.source === node.id)
    .filter((e) =>
      new_outstream
        ?.at(handle_to_index(e.sourceHandle))
        ?.filter(notEmpty)
        ?.some(
          (s, index) =>
            s.kind != e?.data?.stream?.at(index)?.kind ||
            s.identifier != e?.data?.stream?.at(index)?.identifier
          //s.nullable != e?.data?.stream?.at(index)?.nullable
        )
    )
    .map((e) => e.id);

  let wrong_edges_in = edges
    .filter(notEmpty)
    .filter((e) => e.target === node.id)
    .filter((e) =>
      new_instream
        ?.at(handle_to_index(e.targetHandle))
        ?.filter(notEmpty)
        ?.some(
          (s, index) =>
            s.kind != e?.data?.stream?.at(index)?.kind ||
            s.identifier != e?.data?.stream?.at(index)?.identifier
          //s.nullable != e?.data?.stream?.at(index)?.nullable
        )
    )
    .map((e) => e.id);

  return wrong_edges_in.concat(wrong_edges_out);
};

export const arg_to_ark: Connector<ArgNodeData, ArkitektNodeData> = ({
  params,
  nodes,
  sourceNode,
  targetNode,
  edges,
  sourceStream,
  targetStream,
  sourceTypes,
  targetTypes,
}) => {
  let hasConnectedEdges =
    edges.filter((e) => e.source === sourceNode.id).length > 0;

  if (!sourceTypes || !targetTypes) {
    return { errors: [{ message: "No types" }] };
  }

  console.log(sourceNode, sourceTypes);

  return {
    nodes: nodes.map((node) =>
      node.id === sourceNode.id
        ? {
            ...node,
            data: {
              ...node.data,
              outstream: [targetStream],
            },
          }
        : node
    ),
    edges: addEdge(
      {
        ...params,
        data: { stream: targetStream },
        type: "LabeledEdge",
      },
      edges
    ),
    args: targetNode.data.extras?.args
      ?.filter((arg) =>
        targetStream
          .map((i) => i.key)
          .includes(arg?.key || "doeinosienfosienfosienf")
      )
      .filter(notEmpty)
      .map(arkport_to_port),
  };
};

export const ark_to_return: Connector<ArkitektNodeData, ReturnNodeData> = ({
  params,
  nodes,
  sourceNode,
  targetNode,
  edges,
  sourceStream,
  targetStream,
}) => {
  let outtypes = sourceStream?.map((a) => a?.kind);
  let intypes = targetStream?.map((a) => a?.kind);

  let hasConnectedEdges =
    edges.filter((e) => e.target === targetNode.id).length > 0;

  if (!outtypes || !intypes) {
    return { errors: [{ message: "No types" }] };
  }

  if (intypes.length === 0 || !hasConnectedEdges) {
    // Vanilla Return Node
    return {
      nodes: nodes.map((node) =>
        node.id === targetNode.id
          ? {
              ...node,
              data: { ...node.data, instream: [sourceStream] },
            }
          : node
      ),
      edges: addEdge(
        {
          ...params,
          data: {
            stream: sourceStream,
          },
          type: "LabeledEdge",
        },
        edges
      ),
      returns: sourceNode.data.extras?.returns
        ?.filter((p) =>
          sourceStream
            .map((i) => i.key)
            .includes(p?.key || "doeinosienfosienfosienf")
        )
        .filter(notEmpty)
        .map(arkport_to_port),
    };
  }

  if (outtypes.length !== intypes.length) {
    return { errors: [{ message: "Stream length is different" }] };
  }

  if (outtypes.join() !== intypes.join()) {
    return {
      errors: [
        {
          message:
            "Types don't match " +
            outtypes.join(",") +
            "vs " +
            intypes.join(","),
        },
      ],
    };
  }

  return {
    edges: addEdge(
      {
        ...params,
        data: { stream: sourceStream },
        type: "LabeledEdge",
      },
      edges
    ),
  };
};

export const ark_to_ark: Connector = ({
  params,
  nodes,
  sourceNode,
  targetNode,
  edges,
  sourceStream,
  targetStream,
  sourceTypes,
  targetTypes,
}) => {
  if (!sourceTypes || !targetTypes) {
    return { errors: [{ message: "No types" }] };
  }

  if (sourceTypes.length !== targetTypes.length) {
    return { errors: [{ message: "Stream length is different" }] };
  }

  if (sourceTypes.join() !== targetTypes.join()) {
    return {
      errors: [
        {
          message:
            "Types don't match " +
            sourceTypes.join(",") +
            "vs " +
            targetTypes.join(","),
        },
      ],
    };
  }

  return {
    edges: addEdge(
      {
        ...params,
        data: { stream: sourceStream },
        type: "LabeledEdge",
      },
      edges
    ),
  };
};

export const to_reactive: Connector<CommonNode, ReactiveNodeData> = ({
  params,
  nodes,
  sourceNode,
  targetNode,
  edges,
  sourceStream,
  targetStream,
  sourceTypes,
  targetTypes,
}) => {
  let target_index = handle_to_index(params.targetHandle);

  let new_instream = [[]] as (StreamItem | null)[][];
  let new_outstream = [[]] as (StreamItem | null)[][];

  if (
    [
      ReactiveImplementationModelInput.Combinelatest,
      ReactiveImplementationModelInput.Withlatest,
    ].includes(targetNode.data.implementation)
  ) {
    new_instream = targetNode.data.instream
      .filter(notEmpty)
      .map((s, index) => (index == target_index ? sourceStream : s));

    new_outstream = [
      new_instream.reduce((x, news) => (x && x.concat(news)) || x, []),
    ];
  }

  if (
    [ReactiveImplementationModelInput.If].includes(
      targetNode.data.implementation
    )
  ) {
    if (target_index == 0) {
      new_instream = [
        sourceStream,
        targetNode.data.instream.at(1) || [
          {
            key: "true",
            kind: StreamKind.Bool,
            __typename: "StreamItem",
            nullable: false,
          },
        ],
      ];
      new_outstream = [sourceStream, sourceStream];
    } else {
      new_instream = [targetNode.data.instream.at(0) || [], sourceStream];
      new_outstream = targetNode.data.outstream || [];
    }
  }

  if (
    [ReactiveImplementationModelInput.And].includes(
      targetNode.data.implementation
    )
  ) {
    new_instream = [sourceStream];
    new_outstream = [
      sourceStream.map((x) => ({ ...x, nullable: false })),
      sourceStream.map((x) => ({ ...x, nullable: true })),
    ];
  }

  if (
    [ReactiveImplementationModelInput.Chunk].includes(
      targetNode.data.implementation
    )
  ) {
    if (sourceStream.length > 1) {
      return { errors: [{ message: "Chunk only takes one input" }] };
    }
    if (sourceStream.at(0)?.kind !== StreamKind.List) {
      return { errors: [{ message: "Chunk only takes lists as input" }] };
    }
    if (!sourceStream.at(0)?.child?.kind) {
      return {
        errors: [{ message: "Chunk only takes lists as input with a child" }],
      };
    }
    new_instream = [sourceStream];
    new_outstream = [
      sourceStream.map((x) => ({
        key: "element",
        ...x.child,
        nullable: false,
        __typename: "StreamItem",
        kind: x.child?.kind || StreamKind.Structure,
      })),
    ];
  }

  if (
    [ReactiveImplementationModelInput.Split].includes(
      targetNode.data.implementation
    )
  ) {
    if (sourceStream.length <= 1) {
      return {
        errors: [
          {
            message: "Cannot split a stream with less than 2 items",
          },
        ],
      };
    }

    new_instream = [sourceStream];

    new_outstream = sourceStream.map((s) => [s]);
  }

  if (
    [ReactiveImplementationModelInput.ToList].includes(
      targetNode.data.implementation
    )
  ) {
    if (sourceStream.length != 1) {
      return {
        errors: [
          {
            message: "Cannot listify a stream with more than 1 item",
          },
        ],
      };
    }

    new_instream = [sourceStream];

    new_outstream = [
      [
        {
          child: {
            kind: sourceStream[0].kind,
            identifier: sourceStream[0].identifier,
            child: sourceStream[0].child,
            __typename: "StreamItemChild",
          },
          key: "list",
          kind: StreamKind.List,
          nullable: false,
          identifier: sourceStream[0].identifier,
        },
      ],
    ];
  }

  let wrongEdges = calculateWrongEdges(
    edges,
    targetNode,
    new_instream,
    new_outstream
  );

  return {
    nodes: nodes.map((node) =>
      node.id === targetNode.id
        ? {
            ...node,
            data: {
              ...node.data,
              instream: new_instream,
              outstream: new_outstream,
            },
          }
        : node
    ),
    edges: addEdge(
      {
        ...params,
        data: { stream: sourceStream },
        type: "LabeledEdge",
      },
      edges
    ).filter((e) => !wrongEdges.includes(e.id)),
  };

  return {
    errors: [
      {
        message: "nOt implemented yet",
      },
    ],
  };
};

export const reak_to_return: Connector = ({
  params,
  nodes,
  sourceNode,
  targetNode,
  edges,
  sourceTypes,
  targetTypes,
}) => {
  let source_index = handle_to_index(params.sourceHandle);
  let target_index = handle_to_index(params.targetHandle);

  let outtypes = sourceTypes;
  let intypes = targetTypes;

  let hasConnectedEdges =
    edges
      .filter((e) => e.target === targetNode.id)
      .filter((e) => e.targetHandle === params.targetHandle).length > 0;

  if (!outtypes || !intypes) {
    return { errors: [{ message: "No types" }] };
  }

  if (intypes.length === 0 || !hasConnectedEdges) {
    // Vanilla Return Node

    let new_instream = targetNode.data.instream.map((s, index) =>
      index === target_index ? sourceNode.data.outstream[0] : s
    );

    console.log(new_instream);

    let new_outstream = new_instream.reduce(
      (x, news) => x && x.concat(news),
      []
    );

    console.log(new_outstream);

    return {
      nodes: nodes.map((node) =>
        node.id === targetNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                instream: new_instream,
                outstream: [new_outstream],
              },
            }
          : node
      ),
      edges: addEdge(
        {
          ...params,
          data: { stream: sourceNode.data.outstream[0] },
          type: "LabeledEdge",
        },
        edges
      ),
    };
  }

  if (outtypes.length !== intypes.length) {
    return { errors: [{ message: "Stream length is different" }] };
  }

  if (outtypes.join() !== intypes.join()) {
    return {
      errors: [
        {
          message:
            "Types don't match " +
            outtypes.join(",") +
            "vs " +
            intypes.join(","),
        },
      ],
    };
  }

  return {
    edges: addEdge(
      {
        ...params,
        data: { stream: sourceNode.data.outstream[0] },
        type: "LabeledEdge",
      },
      edges
    ),
  };
};

export const reak_to_ark: Connector<ReactiveNodeData, ArkitektNodeData> = ({
  params,
  nodes,
  sourceNode,
  targetNode,
  edges,
  sourceStream,
  targetStream,
  sourceTypes,
  targetTypes,
}) => {
  let outtypes = sourceTypes;
  let intypes = targetTypes;

  let hasConnectedEdges =
    edges
      .filter((e) => e.target === targetNode.id)
      .filter((e) => e.targetHandle === params.targetHandle).length > 0;

  if (
    [
      ReactiveImplementationModelInput.Combinelatest,
      ReactiveImplementationModelInput.Withlatest,
    ].includes(sourceNode.data.implementation)
  ) {
    let new_reak_instreams = targetStream.map((s, index) => [s]);
    let new_reak_outstreams = [targetStream];
    // check which edges are wrong now

    let wrongEdges = calculateWrongEdges(
      edges,
      sourceNode,
      new_reak_instreams,
      new_reak_outstreams
    );

    return {
      nodes: nodes.map((node) =>
        node.id === sourceNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                instream: new_reak_instreams,
                oustream: new_reak_outstreams,
              },
            }
          : node
      ),
      edges: addEdge(
        {
          ...params,
          data: { stream: targetStream },
          type: "LabeledEdge",
        },
        edges
      ).filter((e) => !wrongEdges.includes(e.id)),
    };
  }

  if (
    [ReactiveImplementationModelInput.Chunk].includes(
      sourceNode.data.implementation
    )
  ) {
    let new_reak_instreams = sourceNode.data.instream;
    let new_reak_outstreams = [targetStream];
    // check which edges are wrong now

    let wrongEdges = calculateWrongEdges(
      edges,
      sourceNode,
      new_reak_instreams,
      new_reak_outstreams
    );

    return {
      nodes: nodes.map((node) =>
        node.id === sourceNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                instream: new_reak_instreams,
                oustream: new_reak_outstreams,
              },
            }
          : node
      ),
      edges: addEdge(
        {
          ...params,
          data: { stream: targetStream },
          type: "LabeledEdge",
        },
        edges
      ).filter((e) => !wrongEdges.includes(e.id)),
    };
  }

  if (
    [ReactiveImplementationModelInput.ToList].includes(
      sourceNode.data.implementation
    )
  ) {
    let new_reak_outstreams = sourceNode.data.outstream
      .map((s, index) =>
        index == handle_to_index(params.sourceHandle) ? targetStream : s
      )
      .filter(notEmpty);

    let new_reak_instreams = sourceNode.data.instream;

    // check which edges are wrong now

    let wrongEdges = calculateWrongEdges(
      edges,
      sourceNode,
      new_reak_instreams,
      new_reak_outstreams
    );

    return {
      nodes: nodes.map((node) =>
        node.id === sourceNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                instream: new_reak_instreams,
                oustream: new_reak_outstreams,
              },
            }
          : node
      ),
      edges: addEdge(
        {
          ...params,
          data: { stream: targetStream },
          type: "LabeledEdge",
        },
        edges
      ).filter((e) => !wrongEdges.includes(e.id)),
    };
  }

  if (
    [ReactiveImplementationModelInput.Split].includes(
      sourceNode.data.implementation
    )
  ) {
    let new_reak_outstreams = sourceNode.data.outstream
      .map((s, index) =>
        index == handle_to_index(params.sourceHandle) ? targetStream : s
      )
      .filter(notEmpty);

    let new_reak_instreams = [
      new_reak_outstreams.reduce((x, news) => x && x.concat(news), []),
    ];
    // check which edges are wrong now

    let wrongEdges = calculateWrongEdges(
      edges,
      sourceNode,
      new_reak_instreams,
      new_reak_outstreams
    );

    return {
      nodes: nodes.map((node) =>
        node.id === sourceNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                instream: new_reak_instreams,
                oustream: new_reak_outstreams,
              },
            }
          : node
      ),
      edges: addEdge(
        {
          ...params,
          data: { stream: targetStream },
          type: "LabeledEdge",
        },
        edges
      ).filter((e) => !wrongEdges.includes(e.id)),
    };
  }

  if (
    [ReactiveImplementationModelInput.If].includes(
      sourceNode.data.implementation
    )
  ) {
    let new_reak_outstreams = [
      targetNode.data.instream.at(0) || [],
      targetNode.data.instream.at(0) || [],
    ];

    let new_reak_instreams = [
      targetNode.data.instream.at(0) || [],
      sourceNode.data.instream.at(1) || [],
    ];
    // check which edges are wrong now

    let wrongEdges = calculateWrongEdges(
      edges,
      sourceNode,
      new_reak_instreams,
      new_reak_outstreams
    );

    return {
      nodes: nodes.map((node) =>
        node.id === sourceNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                instream: new_reak_instreams,
                oustream: new_reak_outstreams,
              },
            }
          : node
      ),
      edges: addEdge(
        {
          ...params,
          data: { stream: targetStream },
          type: "LabeledEdge",
        },
        edges
      ).filter((e) => !wrongEdges.includes(e.id)),
    };
  }

  return {
    errors: [
      {
        message: "nOt implemented yet",
      },
    ],
  };
};

export const reak_to_reak: Connector<ReactiveNodeData, ReactiveNodeData> = ({
  params,
  nodes,
  sourceNode,
  targetNode,
  edges,
  sourceStream,
  targetStream,
  sourceTypes,
  targetTypes,
}) => {
  let outtypes = sourceTypes;
  let intypes = targetTypes;

  return {
    errors: [
      {
        message: "nOt implemented yet",
      },
    ],
  };
};

export const arg_to_reak: Connector<ArgNodeData, ReactiveNodeData> = ({
  params,
  nodes,
  sourceNode,
  targetNode,
  edges,
  args,
  sourceStream,
  targetStream,
  sourceTypes,
  targetTypes,
}) => {
  console.log(sourceNode, sourceTypes);

  if (targetStream.length != 1) {
    return {
      errors: [{ message: "Targetstream should only contain one item." }],
    };
  }

  if (sourceTypes.length === 0) {
    // This is the port that is not connected to anything
    let arg = targetStream.at(0);
    if (!arg) {
      return {
        errors: [{ message: "Targetstream should only contain one item." }],
      };
    }

    return {
      nodes: nodes.map((node) =>
        node.id === sourceNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                outstream: [targetStream, ...node.data.outstream],
              },
            }
          : node
      ),
      edges: addEdge(
        {
          ...params,
          data: { stream: targetStream },
          type: "LabeledEdge",
        },
        edges
      ),
      args: [...args, { ...arg, __typename: "ArgPort" }],
    };
  }

  if (sourceTypes.length !== targetTypes.length) {
    return { errors: [{ message: "Types don't match" }] };
  }

  if (sourceTypes.join(",") !== targetTypes.join(",")) {
    return { errors: [{ message: "Types don't match" }] };
  }

  return { errors: [{ message: "Types don't match" }] };
};

export const defaultConnectionHandler: ConnectionMap = {
  ArkitektNode: {
    ArgNode: error_builder("Cannot connect to an Arg Node as an output"),
    ArkitektNode: ark_to_ark,
    KwargNode: error_builder("Cannot connect to a Kwarg Node as an output"),
    ReactiveNode: to_reactive,
    ReturnNode: ark_to_return,
  },
  ArgNode: {
    ArgNode: void_updater,
    ArkitektNode: arg_to_ark,
    KwargNode: void_updater,
    ReactiveNode: arg_to_reak,
    ReturnNode: void_updater,
  },
  KwargNode: {
    ArgNode: void_updater,
    ArkitektNode: void_updater,
    KwargNode: void_updater,
    ReactiveNode: void_updater,
    ReturnNode: void_updater,
  },
  ReturnNode: {
    ArgNode: void_updater,
    ArkitektNode: void_updater,
    KwargNode: void_updater,
    ReactiveNode: void_updater,
    ReturnNode: void_updater,
  },
  ReactiveNode: {
    ArgNode: void_updater,
    ArkitektNode: reak_to_ark,
    KwargNode: void_updater,
    ReactiveNode: to_reactive,
    ReturnNode: reak_to_return,
  },
};
