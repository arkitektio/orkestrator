import { useMemo } from "react";

import { ModulePageList, type ModulePageStat } from "@/core/layout/ModuleHome";
import { useHomeOverviewQuery } from "@/mikro/api/graphql";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/**
 * A week back, to the hour: the cutoff is part of the query's variables, so it
 * holds still between renders (and between visits within the hour) and the
 * cache keeps answering.
 */
const useWeekAgo = () => useMemo(() => new Date(Math.floor((Date.now() - WEEK) / HOUR) * HOUR).toISOString(), []);

const newThisWeek = (count: number) => (count > 0 ? `${count.toLocaleString()} new this week` : "Nothing new this week");

type Count = { count: number };

/** A kind with a timestamp: its total, and what came in since the cutoff. */
const dated = (total: Count, recent: Count): ModulePageStat => ({
  count: total.count,
  note: newThisWeek(recent.count),
});

/**
 * The home page's sidebar: mikro's pages with how much each holds and how much
 * came in this week. Annotations and scenes have no timestamp, so they show a
 * total and keep their description.
 */
export const HomeOverviewSidebar = () => {
  const since = useWeekAgo();
  const { data } = useHomeOverviewQuery({ variables: { since } });

  const stats = useMemo<Partial<Record<string, ModulePageStat>>>(() => {
    if (!data) return {};
    return {
      "/mikro/lenses": dated(data.lenses, data.newLenses),
      "/mikro/arraydatasets": dated(data.arrayDatasets, data.newArrayDatasets),
      "/mikro/coordinatesystems": dated(data.coordinateSystems, data.newCoordinateSystems),
      "/mikro/tabledatasets": dated(data.tableDatasets, data.newTableDatasets),
      "/mikro/sparsedatasets": dated(data.sparseDatasets, data.newSparseDatasets),
      "/mikro/folders": dated(data.folders, data.newFolders),
      "/mikro/files": dated(data.files, data.newFiles),
      "/mikro/charts": dated(data.charts, data.newCharts),
      "/mikro/annotations": { count: data.annotations.count },
      "/mikro/scenes": { count: data.scenes.count },
      "/mikro/collaborations": { count: data.collaborations.length },
    };
  }, [data]);

  return <ModulePageList moduleKey="mikro" stats={stats} className="p-2" />;
};
