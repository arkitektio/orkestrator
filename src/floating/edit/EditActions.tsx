import React from "react";
import { useNavigate } from "react-router";
import { FlowFragment } from "../../fluss/api/graphql";
import { DeployFlowDialog } from "../../fluss/components/dialogs/DeployFlowDialog";
import { ActionButton } from "../../layout/ActionButton";
import { useDialog } from "../../providers/dialog/DialogProvider";
import { withRekuest } from "../../rekuest";
import { useReservationsQuery } from "../../rekuest/api/graphql";
import { useRequester } from "../../rekuest/providers/requester/requester-context";
import { useSettings } from "../../settings/settings-context";
import { useEditRiver } from "./context";

export interface EditActionsProps {
  flow: FlowFragment;
}

export const EditActions: React.FC<EditActionsProps> = (props) => {
  const { saveDiagram, flow, addArkitekt, saving, setLayout, exportDiagram } =
    useEditRiver();

  const { settings } = useSettings();
  const { assign } = useRequester();

  const { data } = withRekuest(useReservationsQuery)({
    variables: { instanceId: settings.instanceId },
  });
  const navigate = useNavigate();

  const { ask } = useDialog();

  const reserved = data?.reservations
    ?.filter((res) => res?.node?.interfaces?.includes(`flow:${flow?.id}`))
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
      <ActionButton
        label={"Deploy"}
        description="Deploy this flow"
        onAction={async () => {
          await ask(DeployFlowDialog, { flow: flow.id });
        }}
      />
      {reserved && (
        <ActionButton
          label={"Run"}
          description="Run this flow"
          onAction={async () => {
            await assign({ reservation: reserved });
          }}
        />
      )}
    </>
  );
};
