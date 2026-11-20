import { ModuleHome, ModuleHomeSidebars } from "@/core/layout/ModuleHome";
import { PageLayout } from "@/core/layout/PageLayout";
import { DialogButton } from "@/core/ui/dialog-button";
import { OmeroArkProject } from "@/core/linkers";
import { PlusIcon } from "@radix-ui/react-icons";
import { useNavigate } from "react-router-dom";
import ProjectList from "../components/lists/ProjectList";
import { DeleteMeButton } from "../ConnectedGuard";
import { OMEROARK_HELP } from "../help";







const Page = () => {

  const navigate = useNavigate();

  return (
    <PageLayout help={OMEROARK_HELP.home} title="Omero Ark" pageActions={<> <DeleteMeButton />


      <DialogButton
        alwaysShow
        name="createproject"
        variant={"outline"}
        size={"sm"}
        dialogProps={{
          onSuccess: (data) => {
            if (data?.createProject) {
              navigate(OmeroArkProject.linkBuilder(data.createProject.id));
            }
          },
        }}
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        Create
      </DialogButton>

    </>} sidebars={
      <ModuleHomeSidebars moduleKey="omeroark" />
    }>
      <ModuleHome
        moduleKey="omeroark"
        pages={false}
        title="Omero Ark"
        description="The projects, datasets and images of your OMERO server."
      >
        <ProjectList />
      </ModuleHome>
    </PageLayout>
  );
};

export default Page;
