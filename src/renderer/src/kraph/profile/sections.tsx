import { FolderKanban, ListTodo } from "lucide-react";
import { useMemo } from "react";

import { ProfileSectionFrame } from "@/core/connection/profile/ProfileSections";
import { ProfileRow, ProfileRows } from "@/core/connection/profile/rows";
import type { ProfileContext, ProfileSection } from "@/core/connection/profile/section";
import { KraphProject, KraphTodoList } from "@/core/linkers";
import { KraphGuard } from "../api/funcs";
import { useProfileTodoListsQuery } from "../api/graphql";

/** Lists the sidebar shows, and how many it reads to find their projects. */
const LISTS_SHOWN = 6;
const LISTS_READ = 24;
const PROJECTS_SHOWN = 5;

/**
 * Both sections read the same query (one request, shared through Apollo's
 * cache): the newest lists assigned to them, each with its project.
 */
const useTheirLists = (sub: string) =>
  useProfileTodoListsQuery({
    variables: { assignee: sub, pagination: { limit: LISTS_READ } },
    fetchPolicy: "cache-and-network",
  });

/** The todo lists assigned to them, newest first, with how far along each is. */
const TodoLists = ({ sub }: ProfileContext) => {
  const { data } = useTheirLists(sub);
  const lists = (data?.todoLists ?? []).slice(0, LISTS_SHOWN);
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

/**
 * The projects they work in: the projects of their lists, the one with their
 * newest list first. A project has no member or creator to ask for directly.
 */
const Projects = ({ sub }: ProfileContext) => {
  const { data } = useTheirLists(sub);
  const projects = useMemo(() => {
    const seen = new Map<string, { project: NonNullable<typeof data>["todoLists"][number]["project"]; lists: number }>();
    for (const list of data?.todoLists ?? []) {
      const entry = seen.get(list.project.id);
      if (entry) entry.lists += 1;
      else seen.set(list.project.id, { project: list.project, lists: 1 });
    }
    return [...seen.values()].slice(0, PROJECTS_SHOWN);
  }, [data]);
  if (projects.length === 0) return null;

  return (
    <ProfileSectionFrame>
      <ProfileRows>
        {projects.map(({ project, lists }) => (
          <KraphProject.Smart key={project.id} object={project}>
            <KraphProject.DetailLink object={project} className="block hover:text-primary">
              <ProfileRow
                icon={<FolderKanban />}
                title={project.name}
                meta={`${lists} ${lists === 1 ? "list" : "lists"}`}
              />
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
