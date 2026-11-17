import { NodeProps, NodeResizer } from "@xyflow/react";
import { memo } from "react";
import { Handles } from "../../components/Handles";
import { PathNodePresentation } from "../../components/PathNodePresentation";
import { ProtocolEventNode } from "../../types";

export default memo(({ data, id, selected }: NodeProps<ProtocolEventNode>) => {
  return (
    <>
      <NodeResizer
        color="var(--primary)"
        isVisible={selected}
        minWidth={100}
        minHeight={30}
      />
      <Handles self={id} />
      <PathNodePresentation
        id={id}
        label={data.label}
        className="rounded-lg"
      />
    </>
  );
});
