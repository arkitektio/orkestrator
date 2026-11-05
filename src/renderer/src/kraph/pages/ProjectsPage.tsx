import { asParamlessRoute } from "@/core/layout/routes/ParamlessRoute";
import { KraphProject } from "@/core/linkers";
import { DialogButton } from "@/core/ui/dialog-button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/core/ui/empty";
import { FolderKanban, PlusIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProjectsQuery } from "../api/graphql";
import { KRAPH_HELP } from "../help";

const useProjects = () => useProjectsQuery({ variables: { pagination: { limit: 200 } } });

const NewProject = () => {
  const navigate = useNavigate();
  return (
    <DialogButton
      alwaysShow
      name="createkraphproject"
      variant="outline"
      size="sm"
      options={{ size: "medium" }}
      dialogProps={{ onSuccess: (data) => navigate(KraphProject.linkBuilder(data.createProject.id)) }}
    >
      <PlusIcon className="mr-2 h-4 w-4" />
      New project
    </DialogButton>
  );
};

const ProjectsPage = asParamlessRoute(useProjects, ({ data }) => (
  <KraphProject.ListPage title="Projects" help={KRAPH_HELP.projects} pageActions={<NewProject />}>
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <p className="text-sm text-muted-foreground">A project is one piece of work, like a study or a round of annotation. Its todo lists hang off it.</p>
      </div>
      {data.projects.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <FolderKanban className="size-8 text-muted-foreground" />
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>Start one to hand out work, like a round of annotation.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <NewProject />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.projects.map((project) => (
            <KraphProject.Smart key={project.id} object={project} className="h-full rounded-lg border bg-card p-3">
              <KraphProject.DetailLink object={project} className="font-medium">
                {project.name}
              </KraphProject.DetailLink>
              {project.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{project.description}</p>}
            </KraphProject.Smart>
          ))}
        </div>
      )}
    </div>
  </KraphProject.ListPage>
));

export default ProjectsPage;
