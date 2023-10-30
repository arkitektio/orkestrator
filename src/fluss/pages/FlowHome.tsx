import * as React from "react";
import { useNavigate } from "react-router";
import {
  BooleanParam,
  NumberParam,
  useQueryParams,
  withDefault,
} from "use-query-params";
import { MyDeployedWorkflows } from "../../components/MyDeployedWorkflows";
import { MyPinnedRuns } from "../../components/MyPinnedRuns";
import { MyPinnedWorkspaces } from "../../components/MyPinnedWorkspaces";
import { MyReservedWorkflows } from "../../components/MyReservedWorkflows";
import { MyRuns } from "../../components/MyRuns";
import { MyDiagrams as MyWorkspaces } from "../../components/MyWorkspaces";
import { CreateFlowDialog } from "../../fluss/components/dialogs/CreateFlowDialog";
import { ImportFlowDialog } from "../../fluss/components/dialogs/ImportFlowDialog";
import { ActionButton } from "../../layout/ActionButton";
import { PageLayout } from "../../layout/PageLayout";
import { FlussWorkspace } from "../../linker";
import { useDialog } from "../../providers/dialog/DialogProvider";
import FlowHomeSidebar from "./FlowHomeSidebar";

interface IFlowHomeProps {}

export interface FlowHomeFilterParams {
  createdDay?: Date;
  limit: number;
  pinned?: boolean;
}

const ISOString = {
  encode: (date: Date) => date.toISOString(),
  decode: (arrayStr: string | (string | null)[] | null | undefined) => {
    if (Array.isArray(arrayStr)) {
      return null;
    }
    return arrayStr ? new Date(arrayStr) : null;
  },
};

let today = new Date();

// create a custom parameter with a default value
const Bool = withDefault(BooleanParam, false);
const Number = withDefault(NumberParam, 10);
const CreatedDay = withDefault(ISOString, new Date());

const FlowHome: React.FunctionComponent<IFlowHomeProps> = (props) => {
  const navigate = useNavigate();
  const [filterParams, setFilterParams] = useQueryParams({
    createdDay: CreatedDay,
    limit: Number,
    pinned: Bool,
  });
  const { ask } = useDialog();

  return (
    <PageLayout
      sidebars={[
        {
          key: "home",
          label: "home",
          content: (
            <FlowHomeSidebar
              setFilterParams={setFilterParams}
            ></FlowHomeSidebar>
          ),
        },
      ]}
      actions={
        <>
          <ActionButton
            label="Create new Workspace"
            onAction={async () => {
              let x = await ask(CreateFlowDialog, {});
              if (x.res.drawvanilla) {
                navigate(FlussWorkspace.linkBuilder(x.res.drawvanilla?.id));
              }
            }}
          />
          <ActionButton
            label="Import Flow"
            onAction={async () => {
              let x = await ask(ImportFlowDialog, {});
              if (x.res.importflow) {
                navigate(FlussWorkspace.linkBuilder(x.res.importflow?.id));
              }
            }}
          />
        </>
      }
    >

      <MyReservedWorkflows/>
      <MyDeployedWorkflows/>
      <MyPinnedRuns limit={80} />
      <MyPinnedWorkspaces limit={80} />
      <MyRuns {...filterParams} />
      <MyWorkspaces {...filterParams} />
    </PageLayout>
  );
};

export default FlowHome;
