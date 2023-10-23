import React from "react";
import { useSearchParams } from "react-router-dom";
import { ActionButton } from "../../layout/ActionButton";
import { PageLayout } from "../../layout/PageLayout";
import { MyContainers } from "../../port/components/MyContainers";
import { MyDeployments } from "../../port/components/MyDeployments";
import { MyRepos } from "../../port/components/MyRepos";
import { MyWhales } from "../../port/components/MyWhales";
import { CreateRepoDialog } from "../../port/components/dialogs/CreateRepoDialog";
import { useDialog } from "../../providers/dialog/DialogProvider";

export interface WhalesHomeProps {}

export const PortHome: React.FC<WhalesHomeProps> = (props) => {
  const [params, setParams] = useSearchParams();
  const { ask } = useDialog();

  return (
    <PageLayout
      actions={
        <ActionButton
          label="Add Repository"
          onAction={async () => {
            await ask(CreateRepoDialog, {});
          }}
        />
      }
    >
      {" "}
      <MyContainers />
      <MyWhales />
      <MyRepos />
    </PageLayout>
  );
};
