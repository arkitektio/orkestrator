import { Handle, Position, useConnection } from "@xyflow/react";

export const Handles = (props: { self: string }) => {
  const connection = useConnection();

  const isTarget =
    connection.inProgress && connection.fromNode.id !== props.self;
  return (
    <div className="absolute top-0 left-0 w-full h-full z-0 group-hover:z-10">
      {!connection.inProgress && (
        <Handle
          className="w-1 h-1 group-hover:bg-chart-3 hover:opacity-50 opacity-0 transition-opacity duration-300"
          position={Position.Top}
          style={{
            width: "100%",
            height: "100%",
            border: 0,
            borderRadius: 5,
            left: 0,
            right: 0,
            zIndex: 0,
            transform: "none",
          }}
          type="source"
          isConnectableStart={false}
          isConnectableEnd={false}
        />
      )}
      {/* We want to disable the target handle, if the connection was started from this node */}
      {(!connection.inProgress || isTarget) && (
        <Handle
          className="w-1 h-1 group-hover:bg-red-500 opacity-0 hover:opacity-100"
          position={Position.Bottom}
          style={{
            width: "100%",
            height: "100%",
            border: 0,
            borderRadius: 5,
            left: 0,
            right: 0,
            zIndex: 0,
            transform: "none",
          }}
          type="target"
          isConnectableStart={false}
        />
      )}
    </div>
  );
};
