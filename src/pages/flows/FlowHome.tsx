import * as React from "react";
import { useNavigate } from "react-router";
import { DeployedFlows } from "../../components/DeployedFlows";
import { DeployableFlows } from "../../components/DeployableFlows";
import { MyDiagrams as MyWorkspaces } from "../../components/MyWorkspaces";
import { MyRuns } from "../../components/MyRuns";
import { CreateFlowModal } from "../../fluss/components/modals/CreateFlowModal";
import { ActionButton } from "../../layout/ActionButton";
import { PageLayout } from "../../layout/PageLayout";

interface IFlowHomeProps {}

const FlowHome: React.FunctionComponent<IFlowHomeProps> = (props) => {
  const navigate = useNavigate();
  const [showCreateFlow, setShowCreateFlow] = React.useState(false);

  return (
    <PageLayout
      actions={
        <>
          <ActionButton
            label="Create new Workspace"
            onAction={async () => setShowCreateFlow(true)}
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
