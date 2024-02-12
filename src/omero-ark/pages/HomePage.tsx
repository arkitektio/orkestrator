import React from "react";
import { useNavigate } from "react-router";
import { ActionButton } from "../../layout/ActionButton";
import { PageLayout } from "../../layout/PageLayout";
import { OmeroArkProject } from "../../linker";
import { useDialog } from "../../providers/dialog/DialogProvider";
import { LogoutButton } from "../components/LogoutButton";
import { CreateProjectDialog } from "../components/dialogs/CreateProjectDialog";
import ProjectList from "../components/lists/ProjectList";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {

  const {ask} = useDialog();
  const navigate = useNavigate()
  return (
    <PageLayout actions={<><ActionButton
      label="Create new Project"
      onAction={async () => {
        let x = await ask(CreateProjectDialog, {});
        if (x.res.createProject) {
          navigate(OmeroArkProject.linkBuilder(x.res.createProject?.id));
        }
      }}
    /></>} sidebars={[{label: "Settings", content: <><LogoutButton/></>, key: "settings"}]} >
      <ProjectList/>
    </PageLayout>
  );
};

export default Page;
