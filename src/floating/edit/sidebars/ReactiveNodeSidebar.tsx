import { FlowNode, ReactiveNodeData } from "../../types";
import { SidebarProps } from "./types";

export const ReactiveNodeSidebar = (
  props: SidebarProps<FlowNode<ReactiveNodeData>>
) => {
  return (
    <>
      <div className="px-5 py-5 flex flex-col">
        <div className="text-white mt-5">Instream</div>
        {props.node.data.instream.map((s) => (
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
        <div className="text-white mt-5">Outstream</div>
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
    </>
  );
};
