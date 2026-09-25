import { Sidebars } from "@/core/components/layout/Sidebars";
import { PageLayout } from "@/core/components/layout/PageLayout";
import { HelpSidebar } from "@/core/components/sidebars/help";
import { DialogButton } from "@/core/components/ui/dialog-button";
import { OmeroArkProject } from "@/core/linkers";
import { PlusIcon } from "@radix-ui/react-icons";
import { useNavigate } from "react-router-dom";
import ProjectList from "../components/lists/ProjectList";
import { DeleteMeButton } from "../ConnectedGuard";
import { HomePageStatisticsSidebar } from "../sidebars/HomePageStatisticsSidebar";







const Page = () => {

  const navigate = useNavigate();

  return (
    <PageLayout title="Projects" pageActions={<> <DeleteMeButton />


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
      <Sidebars>
        <Sidebars.Tab label="Statistics">
          <HomePageStatisticsSidebar />
        </Sidebars.Tab>
        <Sidebars.Tab label="Help">
          <HelpSidebar />
        </Sidebars.Tab>
      </Sidebars>
    }>
      <ProjectList />
    </PageLayout>
  );
};

export default Page;
