import React from "react";
import { MyWhales } from "../../port/components/MyWhales";
import { PageLayout } from "../../layout/PageLayout";
import { MyContainers } from "../../port/components/MyContainers";
import { MyRepos } from "../../port/components/MyRepos";
import { MyRepoScans } from "../../port/components/MyScans";
import { ActionButton } from "../../layout/ActionButton";
import { useDialog } from "../../layout/dialog/DialogProvider";
import { CreateRepoDialog } from "../../port/components/dialogs/CreateRepoDialog";

export interface WhalesHomeProps {}

export const PortHome: React.FC<WhalesHomeProps> = (props) => {
  const { ask } = useDialog();

  return (
    <PageLayout
      actions={
        <ActionButton
          label="Create Whale"
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
