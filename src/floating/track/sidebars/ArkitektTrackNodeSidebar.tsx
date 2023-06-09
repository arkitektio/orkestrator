import { useEffect } from "react";
import Timestamp from "react-timestamp";
import { ListRender } from "../../../layout/SectionTitle";
import { Assignation } from "../../../linker";
import { useAssignationMate } from "../../../mates/assignation/useAssignationMates";
import { withRekuest } from "../../../rekuest";
import {
  AssignationStatus,
  AssignationStatusInput,
  useDetailNodeQuery,
  useNodeAssignationsQuery,
} from "../../../rekuest/api/graphql";
import { useSettings } from "../../../settings/settings-context";
import { ArkitektNodeData, FlowNode } from "../../types";
import { useTrackRiver } from "../context";
import { SidebarProps } from "./types";

const limit = 10;

const tFromReference = (x: string | undefined) => {
  return x ? x.split("_").at(-1) : undefined;
};

export const ArkitektTrackNodeSidebar = (
  props: SidebarProps<FlowNode<ArkitektNodeData>>
) => {
  const { settings } = useSettings();
  const { runState, run, live } = useTrackRiver();
  const { data: node_data, error } = withRekuest(useDetailNodeQuery)({
    variables: { hash: props.node.data.hash },
  });

  const latestEvent = runState?.events?.find(
    (e) => e?.source === props.node.id
  );

  const assMate = useAssignationMate();

  const { data: assignation_data, refetch } = withRekuest(
    useNodeAssignationsQuery
  )({
    variables: {
      reference: props.node.id,
      parent: run?.assignation,
      filter: live
        ? [
            AssignationStatusInput.Yield,
            AssignationStatusInput.Assigned,
            AssignationStatusInput.Yield,
            AssignationStatusInput.Assigned,
            AssignationStatusInput.Pending,
            AssignationStatusInput.Done,
            AssignationStatusInput.Returned,
          ]
        : undefined,
      limit: limit,
      offset: 0,
      order: "-time",
    },
  });

  useEffect(() => {
    if (run?.assignation) {
      let interval = setInterval(() => {
        refetch({
          reference: props.node.id,
          parent: run?.assignation,
          filter: live
            ? [
                AssignationStatusInput.Yield,
                AssignationStatusInput.Assigned,
                AssignationStatusInput.Pending,
                AssignationStatusInput.Done,
                AssignationStatusInput.Returned,
              ]
            : undefined,

          order: "-time",
        });
      }, settings.pollInterval);

      return () => clearInterval(interval);
    }
  }, [props.node.id, run?.assignation, live]);

  return (
    <>
      {" "}
      <div className="px-5 py-5 flex flex-col">
        <div className="text-white text-xl"> {node_data?.node?.name}</div>
        <div className="text-white text-cl mt-4">
          {" "}
          {node_data?.node?.description}
        </div>

        <div className="text-white text-cl mt-4">
          <ListRender
            title="Assigned Tasks"
            array={assignation_data?.assignations}
            refetch={refetch}
            limit={limit}
          >
            {(a) => (
              <Assignation.Smart
                object={a?.id}
                className={`bg-slate-800 rounded p-2 rounded-md relative border border-slate-700 ${
                  [
                    AssignationStatus.Yield,
                    AssignationStatus.Assigned,
                  ].includes(a.status) && "animate-pulse"
                } ${
                  runState?.t == tFromReference(a.reference)
                    ? "bg-blue-800 border-blue-700 border "
                    : ""
                }
                
                
                
                `}
                mates={[assMate(a)]}
              >
                <div className="flex flex-col">
                  <div className="font-light">
                    <Assignation.DetailLink object={a?.id}>
                      {a?.status}
                    </Assignation.DetailLink>
                  </div>

                  {a?.createdAt && <Timestamp date={a?.createdAt} relative />}
                </div>
                <div className="absolute bottom-0 right-0 text-xs">
                  {tFromReference(a?.reference)}
                </div>
              </Assignation.Smart>
            )}
          </ListRender>
        </div>
      </div>
    </>
  );
};
