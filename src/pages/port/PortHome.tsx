import React from "react";
import { MyWhales } from "../../port/components/MyWhales";
import { PageLayout } from "../../layout/PageLayout";
import { MyContainers } from "../../port/components/MyContainers";
import { MyRepos } from "../../port/components/MyRepos";
import { MyRepoScans } from "../../port/components/MyScans";
import { ActionButton } from "../../layout/ActionButton";
import { useDialog } from "../../layout/dialog/DialogProvider";
import { CreateRepoDialog } from "../../port/components/dialogs/CreateRepoDialog";
import { useSearchParams } from "react-router-dom";

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
      <MyRepoScans />
    </PageLayout>
  );
};
