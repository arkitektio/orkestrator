import { Explainer } from "@/components/explainer/Explainer";
import { PageAction } from "@/components/ui/page-action";
import { OmeroArkProject } from "@/linkers";
import { PlusIcon } from "lucide-react";
import ProjectList from "../components/lists/ProjectList";



const Page = () => {

  return (
    <OmeroArkProject.ListPage
      title="Projects"
      pageActions={
        <>
          <PageAction alwaysShow size="sm" icon={<PlusIcon className="h-4 w-4" />}>
            New
          </PageAction>
        </>
      }
    >
      <div className="p-3">
        <Explainer
          title="Projects"
          description="Projects allow you to group your images and files together. Just like folders. "
        />
        <ProjectList />
      </div>
    </OmeroArkProject.ListPage>
  );
};

export default Page;
