import {
  KraphProtocolEventCategory
} from "@/core/linkers";
import { NodeProps, NodeResizer } from "@xyflow/react";
import { memo } from "react";
import { Handles } from "../../components/Handles";
import { PathNodePresentation } from "../../components/PathNodePresentation";
import { NaturalEventNode } from "../../types";

export default memo(({ data, id, selected }: NodeProps<NaturalEventNode>) => {
  return (
    <>
      <NodeResizer
        color="#ff0071"
        isVisible={selected}
        minWidth={100}
        minHeight={30}
      />
      <Handles self={id} />
      <PathNodePresentation
        id={id}
        label={data.label}
        className="rounded-lg"
      >
        <KraphProtocolEventCategory.DetailLink object={{ id: data.id }}>
          <div className="font-semibold">{data.label}</div>
        </KraphProtocolEventCategory.DetailLink>
      </PathNodePresentation>
    </>
  );
});
