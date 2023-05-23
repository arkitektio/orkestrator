import * as React from "react";
import { useNavigate } from "react-router";
import { DeployableFlows } from "../../components/DeployableFlows";
import { DeployedFlows } from "../../components/DeployedFlows";
import { MyRuns } from "../../components/MyRuns";
import { MyDiagrams as MyWorkspaces } from "../../components/MyWorkspaces";
import { ImportFlowDialog } from "../../fluss/components/dialogs/ImportFlowDialog";
import { CreateFlowModal } from "../../fluss/components/modals/CreateFlowModal";
import { ActionButton } from "../../layout/ActionButton";
import { PageLayout } from "../../layout/PageLayout";
import { useDialog } from "../../layout/dialog/DialogProvider";
import { Workspace } from "../../linker";

interface IFlowHomeProps {}

const FlowHome: React.FunctionComponent<IFlowHomeProps> = (props) => {
  const navigate = useNavigate();
  const [showCreateFlow, setShowCreateFlow] = React.useState(false);
  const { ask } = useDialog();

  return (
    <PageLayout
      actions={
        <>
          <ActionButton
            label="Create new Workspace"
            onAction={async () => setShowCreateFlow(true)}
          />
          <ActionButton
            label="Import Flow"
            onAction={async () => {
              let x = await ask(ImportFlowDialog, {});
              if (x) {
                navigate(Workspace.linkBuilder(x.res.importflow?.id));
              }
            }}
          />
        </>
      }
    >
      <DeployedFlows />
      <DeployableFlows />
      <MyRuns />
      <MyWorkspaces />

      <CreateFlowModal show={showCreateFlow} setShow={setShowCreateFlow} />
    </PageLayout>
  );
};

export default FlowHome;
