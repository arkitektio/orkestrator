import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { KraphTodoList, KraphProject } from "@/core/linkers";
import { DialogButton } from "@/core/ui/dialog-button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/core/ui/empty";
import { Progress } from "@/core/ui/progress";
import { ListTodo, Pencil, PlusIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProjectQuery } from "../api/graphql";
import { TodoAssignee } from "../components/todos/TodoAssignee";
import { KRAPH_HELP } from "../help";

const NewList = ({ project }: { project: string }) => {
  const navigate = useNavigate();
  return (
    <DialogButton
      alwaysShow
      name="createtodolist"
      variant="outline"
      size="sm"
      options={{ size: "medium" }}
      dialogProps={{ project, onSuccess: (data) => navigate(KraphTodoList.linkBuilder(data.createTodoList.id)) }}
    >
      <PlusIcon className="mr-2 h-4 w-4" />
      New list
    </DialogButton>
  );
};

const EditProject = ({ project }: { project: string }) => (
  <DialogButton
    alwaysShow
    name="editkraphproject"
    variant="outline"
    size="sm"
    options={{ size: "medium" }}
    dialogProps={{ id: project }}
  >
    <Pencil className="mr-2 h-4 w-4" />
    Edit
  </DialogButton>
);

/** One project: its todo lists, who each is for, and how far along each is. */
const ProjectPage = asDetailQueryRoute(useProjectQuery, ({ data }) => {
  const project = data.project;
  return (
    <KraphProject.ModelPage object={project} title={project.name} help={KRAPH_HELP.project} pageActions={
        <>
          <EditProject project={project.id} />
          <NewList project={project.id} />
        </>
      }>
      <div className="flex flex-col gap-4 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
        </div>
        {project.todoLists.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <ListTodo className="size-8 text-muted-foreground" />
              <EmptyTitle>No todo lists yet</EmptyTitle>
              <EmptyDescription>A list is a board of things to do, usually for one person.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <NewList project={project.id} />
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {project.todoLists.map((list) => (
              <KraphTodoList.Smart key={list.id} object={list} className="h-full rounded-lg border bg-card p-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <KraphTodoList.DetailLink object={list} className="min-w-0 flex-1 truncate font-medium">
                      {list.name}
                    </KraphTodoList.DetailLink>
                    <TodoAssignee own={list.assignee} />
                  </div>
                  {list.description && <p className="line-clamp-2 text-xs text-muted-foreground">{list.description}</p>}
                  <div className="flex items-center gap-2">
                    <Progress value={list.progress.total ? (100 * list.progress.done) / list.progress.total : 0} className="h-1.5" />
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {list.progress.done}/{list.progress.total}
                    </span>
                  </div>
                </div>
              </KraphTodoList.Smart>
            ))}
          </div>
        )}
      </div>
    </KraphProject.ModelPage>
  );
});

export default ProjectPage;
