import { useMemo } from "react";

import { ModulePageList, type ModulePageStat } from "@/core/layout/ModuleHome";
import { useHomePageStatsQuery } from "../api/graphql";

/**
 * The home page's sidebar: rekuest's pages, with how much the two it can count
 * hold. Both numbers are the organization's (`actionStats` / `taskStats` are
 * scoped to it), so the task count sits on Org Tasks, not on your own Tasks.
 * A failed count just leaves the rows with their descriptions.
 */
export const HomeOverviewSidebar = () => {
  const { data } = useHomePageStatsQuery();

  const stats = useMemo<Partial<Record<string, ModulePageStat>>>(() => {
    if (!data) return {};
    return {
      "/rekuest/actions": { count: data.actionStats.count },
      "/rekuest/org-tasks": { count: data.taskStats.count },
    };
  }, [data]);

  return <ModulePageList moduleKey="rekuest" stats={stats} className="p-2" />;
};
