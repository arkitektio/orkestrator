import { addEdge } from "reactflow";
import {
  PortChildFragment,
  PortFragment,
  ReactiveImplementationModelInput,
  Scope,
  StreamKind
} from "../../../fluss/api/graphql";
import {
  ArgNodeData,
  ArkitektNodeData,
  CommonNode,
  ConnectionMap,
  Connector,
  FlowEdge,
  ReactiveNodeData,
  ReturnNodeData
} from "../../types";
import { flussPortToStreamItem, notEmpty } from "../../utils";

export const void_updater: Connector = ({ params, nodes, edges }) => {
  return {
    nodes: nodes,
    edges: edges,
    errors: [{ message: "Not Implemented yet" }],
  };
};

export const unsetPort: PortFragment = {
  key: "unset",
  kind: StreamKind.Unset,
  identifier: "unset",
  nullable: false,
  scope: Scope.Global,
};

export const cleanToChild = (port: PortFragment): PortChildFragment => {
  const { key, label, description, ...rest } = port;
  return { ...rest, __typename: "PortChild" };
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

export const streamMatch = (
  astream: ((PortFragment | null | undefined)[] | null) | null,
  bstream: PortFragment[]
): boolean => {
  if (!astream || !bstream) {
    return false;
  }
  if (astream.length != bstream.length) {
    return false;
  }
  return astream.every((s, index) => {
    if (!s || !bstream[index]) {
      return false;
    }
    return (
      s?.kind === bstream[index].kind &&
      s?.identifier === bstream[index].identifier
    );
  });
};

export const calculateWrongEdges = (
  edges: FlowEdge[],
  node: { id: string },
  new_instream: ((PortFragment | null | undefined)[] | null)[] | null,
  new_outstream: ((PortFragment | null | undefined)[] | null)[] | null
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
        data: { stream: targetStream.map(flussPortToStreamItem) },
        type: "LabeledEdge",
      },
      edges
    ),
    args: targetStream,
  };
};

export const to_return: Connector<ArkitektNodeData, ReturnNodeData> = ({
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
            stream: sourceStream.map(flussPortToStreamItem),
          },
          type: "LabeledEdge",
        },
        edges
      ),
      returns: sourceStream,
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
        data: { stream: sourceStream.map(flussPortToStreamItem) },
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
        data: { stream: sourceStream.map(flussPortToStreamItem) },
        type: "LabeledEdge",
      },
      edges
    ),
  };
};

export const to_filter: Connector = ({
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
        data: { stream: sourceStream.map(flussPortToStreamItem) },
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

  let new_instream = [[]] as (PortFragment | null)[][];
  let new_outstream = [[]] as (PortFragment | null)[][];

  if (
    [
      ReactiveImplementationModelInput.Combinelatest,
      ReactiveImplementationModelInput.Withlatest,
      ReactiveImplementationModelInput.Zip,
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
    [
      ReactiveImplementationModelInput.Add,
      ReactiveImplementationModelInput.Modulo,
      ReactiveImplementationModelInput.Multiply,
      ReactiveImplementationModelInput.Divide,
      ReactiveImplementationModelInput.Subtract,
    ].includes(targetNode.data.implementation)
  ) {
    let x = sourceStream.filter(
      (x) => x.kind != StreamKind.Int && x.kind != StreamKind.Float
    );
    if (x.length > 0) {
      return { errors: [{ message: "Only int and float streams allowed" }] };
    }

    new_instream = [sourceStream];
    new_outstream = [sourceStream];
  }

  

  if (
    [ReactiveImplementationModelInput.Gate].includes(
      targetNode.data.implementation
    )
  ) {
    if (target_index == 0) {
      console.log(targetNode.data.instream);
      new_instream = [
        sourceStream,
        targetNode.data.instream.at(1) || [unsetPort],
      ];

      new_outstream = [sourceStream];
    } else {
      new_instream = [
        targetNode.data.instream.at(0) || [unsetPort],
        sourceStream,
      ];
      new_outstream = targetNode.data.outstream || [[unsetPort]];
    }
  }

  if (
    [ReactiveImplementationModelInput.All].includes(
      targetNode.data.implementation
    )
  ) {
    new_instream = [sourceStream];
    new_outstream = [
      sourceStream.map((x) => ({ ...x, nullable: false })),
      targetNode.data.outstream.at(1) || [unsetPort],
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
            __typename: "Port",
            nullable: false,
            scope: Scope.Global,
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
    [ReactiveImplementationModelInput.BufferComplete].includes(
      targetNode.data.implementation
    )
  ) {
    if (sourceStream.length > 1) {
      return {
        errors: [
          { message: "Buffercomplete can only buzffer one input currently" },
        ],
      };
    }

    let x = sourceStream.at(0);

    if (!x) {
      return {
        errors: [{ message: "Needs to have a defined stream" }],
      };
    }
    new_instream = [sourceStream];

    new_outstream = [
      [
        {
          key: "buffer",
          child: cleanToChild(x),
          scope: Scope.Global,
          nullable: false,
          kind: StreamKind.List,
        },
      ],
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

    // Flaten
    new_instream = [sourceStream];
    new_outstream = [
      sourceStream.map((x) => ({
        key: "element",
        label: "Element of" + (x.label || x.key),
        description: "Element of" + x.description,
        nullable: x.nullable,
        kind: x.child?.kind || StreamKind.Bool,
        identifier: x.child?.identifier,
        assignWidget: x.child?.assignWidget, // yanked up
        returnWidget: x.child?.returnWidget,
        scope: Scope.Global,
      })),
    ];
  }

  if (
    [ReactiveImplementationModelInput.Ensure].includes(
      targetNode.data.implementation
    )
  ) {
    new_instream = [sourceStream];
    new_outstream = [
      sourceStream.map((x) => ({
        ...x,
        nullable: false,
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

    new_outstream = sourceStream.map((s) => [{ ...s, nullable: false }]);
  }

  if (
    [ReactiveImplementationModelInput.Filter].includes(
      targetNode.data.implementation
    )
  ) {


    if (sourceStream.length != 1) {
      return {
        errors: [
          {
            message: "Can only filter a stream with exactly one item",
          },
        ],
      };
    }


    let union = sourceStream.at(0);
    if (union?.kind != StreamKind.Union) {
      return {
        errors: [
          {
            message: "Can only filter a union",
          },
        ],
      };
    }


    new_instream = [sourceStream];
    new_outstream = union?.variants?.filter(notEmpty).map((s, index) => [{ ...s, nullable: false, key: `variant_${index}`, __typename: "Port"  }]) || [];
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
          child: cleanToChild(sourceStream.at(0)),
          scope: Scope.Global,
          key: "list",
          kind: StreamKind.List,
          nullable: false,
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
        data: { stream: sourceStream.map(flussPortToStreamItem) },
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
      ReactiveImplementationModelInput.Add,
      ReactiveImplementationModelInput.Modulo,
      ReactiveImplementationModelInput.Multiply,
      ReactiveImplementationModelInput.Divide,
      ReactiveImplementationModelInput.Subtract,
    ].includes(sourceNode.data.implementation)
  ) {
    let x = targetStream.filter(
      (x) => x.kind != StreamKind.Int && x.kind != StreamKind.Float
    );
    if (x.length > 0) {
      return { errors: [{ message: "Only int and float streams allowed" }] };
    }

    let new_reak_instreams = [targetStream];
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
          data: { stream: targetStream.map(flussPortToStreamItem) },
          type: "LabeledEdge",
        },
        edges
      ).filter((e) => !wrongEdges.includes(e.id)),
    };
  }

  if (
    [
      ReactiveImplementationModelInput.Filter,
    ].includes(sourceNode.data.implementation)
  ) {
    if (streamMatch(sourceStream, targetStream)) {
      return {
        edges: addEdge(
          {
            ...params,
            data: { stream: targetStream.map(flussPortToStreamItem) },
            type: "LabeledEdge",
          },
          edges
        ),
      };
    }
    else {
      return {
        errors: [
          {
            message: "Filter can only be connected to the same stream",
          },
        ],
    };
  };

  }

  if (
    [
      ReactiveImplementationModelInput.Combinelatest,
      ReactiveImplementationModelInput.Withlatest,
      ReactiveImplementationModelInput.Zip,
    ].includes(sourceNode.data.implementation)
  ) {
    if (streamMatch(sourceStream, targetStream)) {
      return {
        edges: addEdge(
          {
            ...params,
            data: { stream: targetStream.map(flussPortToStreamItem) },
            type: "LabeledEdge",
          },
          edges
        ),
      };
    }

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
          data: { stream: targetStream.map(flussPortToStreamItem) },
          type: "LabeledEdge",
        },
        edges
      ).filter((e) => !wrongEdges.includes(e.id)),
    };
  }

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
          data: { stream: targetStream.map(flussPortToStreamItem) },
          type: "LabeledEdge",
        },
        edges
      ).filter((e) => !wrongEdges.includes(e.id)),
    };
  }

  if (
    [ReactiveImplementationModelInput.All].includes(
      sourceNode.data.implementation
    )
  ) {
    let new_reak_instreams = [targetStream];
    let new_reak_outstreams = [targetStream, sourceNode.data.outstream[0]];
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
          data: { stream: targetStream.map(flussPortToStreamItem) },
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
    let new_reak_instreams = [
      targetStream.map((s, index) => {
        return {
          child: cleanToChild(s),
          key: `list${index}`,
          label: "List of " + s.label,
          nullable: false,
          scope: Scope.Global,
          kind: StreamKind.List,
        };
      }),
    ];
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
          data: { stream: targetStream.map(flussPortToStreamItem) },
          type: "LabeledEdge",
        },
        edges
      ).filter((e) => !wrongEdges.includes(e.id)),
    };
  }

  if (
    [ReactiveImplementationModelInput.Gate].includes(
      sourceNode.data.implementation
    )
  ) {
    let new_reak_outstreams = [targetStream];
    let new_reak_instreams = [
      targetStream,
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
          data: { stream: targetStream.map(flussPortToStreamItem) },
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
          data: { stream: targetStream.map(flussPortToStreamItem) },
          type: "LabeledEdge",
        },
        edges
      ).filter((e) => !wrongEdges.includes(e.id)),
    };
  }

  if (
    [ReactiveImplementationModelInput.BufferComplete].includes(
      sourceNode.data.implementation
    )
  ) {
    let new_reak_outstreams = [targetStream];
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
          data: { stream: targetStream.map(flussPortToStreamItem) },
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
          data: { stream: targetStream.map(flussPortToStreamItem) },
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
          data: { stream: targetStream.map(flussPortToStreamItem) },
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

  let sourceUnset = sourceStream.some((i) => i.kind == StreamKind.Unset);
  let targetUnset = targetStream.some((i) => i.kind == StreamKind.Unset);

  if (sourceUnset && targetUnset) {
    return {
      errors: [{ message: "not implemented yet" }],
    };
  }

  return {
    errors: [{ message: "not implemented yet" }],
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
  console.log(sourceNode, targetStream);

  // This is the port that is not connected to anything

  let wrongEdges = calculateWrongEdges(edges, sourceNode, [], [targetStream]);

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
        data: { stream: targetStream.map(flussPortToStreamItem) },
        type: "LabeledEdge",
      },
      edges
    ).filter((e) => !wrongEdges.includes(e.id)),
    args: targetStream,
  };
};

export const defaultConnectionHandler: ConnectionMap = {
  ArkitektNode: {
    ArgNode: error_builder("Cannot connect to an Arg Node as an output"),
    ArkitektNode: ark_to_ark,
    LocalNode: ark_to_ark,
    KwargNode: error_builder("Cannot connect to a Kwarg Node as an output"),
    ReactiveNode: to_reactive,
    ReturnNode: to_return,
    GraphNode: arg_to_ark,
    ArkitektFilterNode: to_filter,
  },
  LocalNode: {
    ArgNode: error_builder("Cannot connect to an Arg Node as an output"),
    ArkitektNode: ark_to_ark,
    LocalNode: ark_to_ark,
    KwargNode: error_builder("Cannot connect to a Kwarg Node as an output"),
    ReactiveNode: to_reactive,
    ReturnNode: to_return,
    GraphNode: ark_to_ark,
    ArkitektFilterNode: to_filter,
  },
  ArgNode: {
    ArgNode: void_updater,
    ArkitektNode: arg_to_ark,
    LocalNode: arg_to_ark,
    KwargNode: void_updater,
    ReactiveNode: arg_to_reak,
    ReturnNode: void_updater,
    GraphNode: arg_to_ark,
    ArkitektFilterNode: to_filter,
  },
  KwargNode: {
    ArgNode: void_updater,
    ArkitektNode: void_updater,
    LocalNode: void_updater,
    KwargNode: void_updater,
    ReactiveNode: void_updater,
    ReturnNode: void_updater,
    GraphNode: void_updater,
    ArkitektFilterNode: void_updater,
  },
  GraphNode: {
    ArgNode: void_updater,
    ArkitektNode: void_updater,
    LocalNode: void_updater,
    KwargNode: void_updater,
    ReactiveNode: void_updater,
    ReturnNode: void_updater,
    GraphNode: void_updater,
    ArkitektFilterNode: to_filter,
  },
  ReturnNode: {
    ArgNode: void_updater,
    ArkitektNode: void_updater,
    LocalNode: void_updater,
    KwargNode: void_updater,
    ReactiveNode: void_updater,
    ReturnNode: void_updater,
    GraphNode: void_updater,
    ArkitektFilterNode: to_filter,
  },
  ReactiveNode: {
    ArgNode: void_updater,
    ArkitektNode: reak_to_ark,
    LocalNode: reak_to_ark,
    KwargNode: void_updater,
    ReactiveNode: to_reactive,
    ReturnNode: to_return,
    GraphNode: reak_to_ark,
    ArkitektFilterNode: to_filter,
  },
  ArkitektFilterNode: {
    ArgNode: error_builder("Cannot connect to an Arg Node as an output"),
    ArkitektNode: ark_to_ark,
    LocalNode: ark_to_ark,
    KwargNode: error_builder("Cannot connect to a Kwarg Node as an output"),
    ReactiveNode: to_reactive,
    ReturnNode: to_return,
    GraphNode: arg_to_ark,
    ArkitektFilterNode: to_filter,
  }
};
