import { FolderKanban, ListTodo } from "lucide-react";
import { ProfileSectionFrame } from "@/core/connection/profile/ProfileSections";
import { ProfileRow, ProfileRows } from "@/core/connection/profile/rows";
import type { ProfileContext, ProfileSection } from "@/core/connection/profile/section";
import { KraphProject, KraphTodoList } from "@/core/linkers";
import { KraphGuard } from "../api/funcs";
import { useProfileProjectsQuery, useProfileTodoListsQuery } from "../api/graphql";

/** Lists and projects the sidebar shows. */
const LISTS_SHOWN = 6;
const PROJECTS_SHOWN = 5;

/** The todo lists assigned to them, newest first, with how far along each is. */
const TodoLists = ({ sub }: ProfileContext) => {
  const { data } = useProfileTodoListsQuery({
    variables: { assignee: sub, pagination: { limit: LISTS_SHOWN } },
    fetchPolicy: "cache-and-network",
  });
  const lists = data?.todoLists ?? [];
  if (lists.length === 0) return null;

  return (
    <ProfileSectionFrame>
      <ProfileRows>
        {lists.map((list) => (
          <KraphTodoList.Smart key={list.id} object={list}>
            <KraphTodoList.DetailLink object={list} className="block hover:text-primary">
              <ProfileRow
                icon={<ListTodo />}
                title={list.name}
                meta={list.progress.total > 0 ? `${list.progress.done}/${list.progress.total}` : undefined}
              />
            </KraphTodoList.DetailLink>
          </KraphTodoList.Smart>
        ))}
      </ProfileRows>
    </ProfileSectionFrame>
  );
};

/** The projects they work on (made, or holding a list or item assigned to them), newest first. */
const Projects = ({ sub }: ProfileContext) => {
  const { data } = useProfileProjectsQuery({
    variables: { member: sub, pagination: { limit: PROJECTS_SHOWN } },
    fetchPolicy: "cache-and-network",
  });
  const projects = data?.projects ?? [];
  if (projects.length === 0) return null;

  return (
    <ProfileSectionFrame>
      <ProfileRows>
        {projects.map((project) => (
          <KraphProject.Smart key={project.id} object={project}>
            <KraphProject.DetailLink object={project} className="block hover:text-primary">
              <ProfileRow icon={<FolderKanban />} title={project.name} />
            </KraphProject.DetailLink>
          </KraphProject.Smart>
        ))}
      </ProfileRows>
    </ProfileSectionFrame>
  );
};

export const KRAPH_PROFILE_SECTIONS: ProfileSection[] = [
  {
    id: "kraph.projects",
    module: "kraph",
    title: "Projects",
    icon: FolderKanban,
    priority: 10,
    Guard: KraphGuard,
    Component: Projects,
  },
  {
    id: "kraph.todolists",
    module: "kraph",
    title: "Todo lists",
    icon: ListTodo,
    priority: 20,
    Guard: KraphGuard,
    Component: TodoLists,
  },
];
