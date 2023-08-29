import React from "react";
import { useNavigate } from "react-router";
import { FlowFragment } from "../../fluss/api/graphql";
import { DeployFlowDialog } from "../../fluss/components/dialogs/DeployFlowDialog";
import { ActionButton } from "../../layout/ActionButton";
import { RekuestNode } from "../../linker";
import { useDialog } from "../../providers/dialog/DialogProvider";
import { withRekuest } from "../../rekuest";
import { ReservationStatus, useNodesQuery } from "../../rekuest/api/graphql";
import { useRequester } from "../../rekuest/providers/requester/requester-context";
import { useReserver } from "../../rekuest/providers/reserver/reserver-context";
import { useEditRiver } from "./context";

export interface EditActionsProps {
  flow: FlowFragment;
}

export const EditActions: React.FC<EditActionsProps> = (props) => {
  const { saveDiagram, flow, addArkitekt, saving, setLayout, exportDiagram } =
    useEditRiver();
  const { assign } = useRequester();
  const { reservations, reserve } = useReserver();
  const navigate = useNavigate();

  const { ask } = useDialog();

  const { data: deployable, subscribeToMore } = withRekuest(useNodesQuery)({
    variables: { interfaces: [`flow:${flow?.id}`] },
  });

  const reserved = reservations?.reservations
    ?.filter((res) => res?.node?.interfaces?.includes(`flow:${flow?.id}`))
    .at(0);

  const deployed = deployable?.allnodes?.at(0);

  const deployRes = reservations?.reservations
    ?.filter((res) => res?.node?.interfaces?.includes("fluss:deploy"))
    ?.filter((res) => res?.status == ReservationStatus.Active)
    .at(0);

  const undeployRes = reservations?.reservations
    ?.filter((res) => res?.node?.interfaces?.includes("fluss:undeploy"))
    .at(0);

  const onExport = () => {
    let nput = exportDiagram();
    let x = JSON.stringify(nput, null, 4);
    // Download the file
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(x)
    );
    element.setAttribute("download", `${flow?.name}.json`);

    element.style.display = "none";

    element.click();

    document.body.removeChild(element);
  };

  return (
    <>
      <ActionButton
        label="Save"
        description="Save this flow"
        onAction={async () => {
          await saveDiagram();
        }}
      />
      <ActionButton
        label="Layout"
        description="Auto Layout this flow"
        onAction={async () => {
          setLayout("LR");
        }}
      />
      <ActionButton
        label="Export"
        description="Export this flow"
        onAction={async () => {
          onExport();
        }}
      />
      {!deployed && (
        <ActionButton
          label={!deployed ? "Deploy" : "Redeploy"}
          inactive={!deployRes}
          description="Deploy this flow"
          onAction={async () => {
            await ask(DeployFlowDialog, { flow: flow.id });
          }}
        />
      )}
      {deployed && (
        <ActionButton
          label={"Open"}
          description="Undeploy this flow"
          onAction={async () => {
            navigate(RekuestNode.linkBuilder(deployed.id));
          }}
        />
      )}
    </>
  );
};
