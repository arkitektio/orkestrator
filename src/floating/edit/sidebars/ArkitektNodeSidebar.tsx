import { useEffect } from "react";
import { ArkitektNode } from "../../../fluss/api/graphql";
import { withRekuest } from "../../../rekuest";
import { useDetailNodeQuery } from "../../../rekuest/api/graphql";
import { ConstantsForm } from "../../../rekuest/components/ConstantsForm";
import { ArkitektNodeData, FlowNode } from "../../types";
import { useEditRiver } from "../context";
import { SidebarProps } from "./types";

export const ArkitektNodeSidebar = (
  props: SidebarProps<FlowNode<ArkitektNodeData>>
) => {
  const { updateNodeIn, updateNodeOut, updateNodeExtras } = useEditRiver();
  const { data: node_data, error } = withRekuest(useDetailNodeQuery)({
    variables: { hash: props.node.data.hash },
  });

  useEffect(() => {
    if (node_data) {
      updateNodeExtras(props.node.id, {
        ...props.node.data,
        extras: node_data.node,
      });
    }
  }, [node_data]);

  return (
    <>
      {" "}
      <div className="px-5 py-5 flex flex-col">
        <div className="text-white text-xl"> {node_data?.node?.name}</div>
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
        <div className="text-white text-cl mt-4">
          {" "}
          {node_data?.node?.description}
        </div>
        <div className="text-white mt-5">Constants</div>
        {node_data?.node?.id && (
          <ConstantsForm
            node={node_data?.node.id}
            omit={
              (props.node.data.instream[0] &&
                props.node.data.instream[0].map(
                  (s) => s?.key || "oisnosins"
                )) ||
              []
            }
            autoSubmit={true}
            onSubmit={async (values, values_as_dict) => {
              updateNodeExtras(props.node.id, {
                ...props.node.data,
                defaults: values_as_dict,
              });
            }}
            initial={props.node.data.defaults}
          />
        )}
      </div>
    </>
  );
};
