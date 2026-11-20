import { ChartSpline, Grid3x3, Layers3Icon } from "lucide-react";

import { MikroChart, MikroFolder, MikroGrid, MikroScene } from "@/core/linkers";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import type { GetTableDatasetQuery } from "@/mikro/api/graphql";

import { RESIDENT_ICON, isNamedResident, residentLink, residentName } from "../residents/residentLinks";

type PageTable = GetTableDatasetQuery["tableDataset"];

/**
 * The facts about a table dataset that used to sit above its rows, as Info
 * rail sections: the page body is the table alone. Each renders nothing when
 * it has nothing to say.
 */

const HEADING = "text-xs font-semibold";
const ROW = "flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-xs hover:bg-muted";

/**
 * **Describes**: the containers whose contents ARE its row ids
 * (`TableDataset.keyedBy`) — the label mask whose objects it measures, the
 * mesh collection whose surfaces — each with the id column it lands on. The
 * one fact that turns a grid of numbers back into objects, and the way back
 * to them.
 */
export const TableDescribesSection = ({ dataset }: { dataset: PageTable }) => {
  const keys = dataset.keyedBy.filter((key) => isNamedResident(key.source));
  if (keys.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className={HEADING}>Describes</div>
      {keys.map((key) => {
        if (!isNamedResident(key.source)) return null;
        const source = key.source;
        const Icon = RESIDENT_ICON[source.__typename];
        const body = (
          <>
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate font-medium">{residentName(source)}</span>
            {key.produces.length > 0 && (
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">by {key.produces.join(", ")}</span>
            )}
          </>
        );
        const link = residentLink(source);
        return (
          <span key={`${source.__typename}:${source.id}`} title={keyTitle(key.produces, key.passesThrough)}>
            {link ? link({ className: ROW, children: body }) : <span className={ROW}>{body}</span>}
          </span>
        );
      })}
    </div>
  );
};

/** Who made the table, through which task, when, and the folder it is filed in. */
export const TableMadeSection = ({ dataset }: { dataset: PageTable }) => {
  const by = dataset.createdThroughBy?.sub;
  const task = dataset.createdThrough;
  const created = task?.createdAt ? new Date(task.createdAt) : null;
  if (!by && !task && !dataset.folder) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className={HEADING}>Made</div>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-xs">
        {by && (
          <>
            <dt className="text-muted-foreground">By</dt>
            <dd className="min-w-0">
              <StructureDisplay identifier="@lok/user" id={by} variant="inline" />
            </dd>
          </>
        )}
        {task && (
          <>
            <dt className="text-muted-foreground">Through</dt>
            <dd className="min-w-0">
              <StructureDisplay identifier="@rekuest/task" id={task.taskId} variant="chip" />
            </dd>
          </>
        )}
        {created && (
          <>
            <dt className="text-muted-foreground">On</dt>
            <dd className="tabular-nums" title={created.toLocaleString()}>
              {created.toLocaleDateString()}
            </dd>
          </>
        )}
        {dataset.folder && (
          <>
            <dt className="text-muted-foreground">Folder</dt>
            <dd className="min-w-0 truncate">
              <MikroFolder.DetailLink object={dataset.folder} className="hover:underline">
                {dataset.folder.name}
              </MikroFolder.DetailLink>
            </dd>
          </>
        )}
      </dl>
    </div>
  );
};

/**
 * **Shown in**: the scenes, charts and grids that draw this table
 * (`TableDataset.visualizations`), each a link straight to it.
 */
export const TableShownInSection = ({ dataset }: { dataset: PageTable }) => {
  if (dataset.visualizations.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className={HEADING}>Shown in</div>
      {dataset.visualizations.map((visualization) => (
        <VisualizationRow key={`${visualization.__typename}:${visualization.id}`} visualization={visualization} />
      ))}
    </div>
  );
};

type PageVisualization = PageTable["visualizations"][number];

/** One composition drawing this table: its kind's icon and name, linking to its page. */
const VisualizationRow = ({ visualization }: { visualization: PageVisualization }) => {
  const body = (Icon: typeof ChartSpline, kind: string) => (
    <>
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label={kind} />
      <span className="min-w-0 truncate font-medium">{visualization.name}</span>
    </>
  );
  switch (visualization.__typename) {
    case "Chart":
      return (
        <MikroChart.DetailLink object={visualization} className={ROW} title="Chart">
          {body(ChartSpline, "Chart")}
        </MikroChart.DetailLink>
      );
    case "Grid":
      return (
        <MikroGrid.DetailLink object={visualization} className={ROW} title="Grid">
          {body(Grid3x3, "Grid")}
        </MikroGrid.DetailLink>
      );
    case "Scene":
      return (
        <MikroScene.DetailLink object={visualization} className={ROW} title="Scene">
          {body(Layers3Icon, "Scene")}
        </MikroScene.DetailLink>
      );
    default:
      return null;
  }
};

/** "One row per object of this mask, found by i (and t)". */
const keyTitle = (produces: readonly string[], passes: readonly string[]): string =>
  `One row per object, found by ${produces.join(", ") || "its id"}${passes.length ? ` (and ${passes.join(", ")})` : ""}`;
