import { FlowNodeCommonsFragment } from "../../../fluss/api/graphql";
import { FlowNode } from "../../types";
import { useEditRiver } from "../context";

export const StreamDisplay = (props: {
  node: FlowNode<FlowNodeCommonsFragment>;
}) => {
  const { flow } = useEditRiver();

  return (
    <div className="flex flex-row-+ text-white mt-2">
      <div className="flex-1 text-white border border-1">
        {props.node.data.instream.map((s) => (
          <div className="text-white border">
            {s?.map((s) => (
              <>
                <div>{s?.kind}</div>
                <div>{s?.identifier}</div>
                <div>{s?.child?.identifier}</div>
              </>
            ))}
          </div>
        ))}
      </div>
      <div className="flex-1 text-white border border-1">
        {props.node.data.outstream.map((s) => (
          <div className="text-white mt-5">
            {s?.map((s) => (
              <>
                <div>{s?.kind}</div>
                <div>{s?.identifier}</div>
                <div>{s?.child?.identifier}</div>
              </>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
