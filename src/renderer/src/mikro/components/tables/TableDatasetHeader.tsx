import type { ReactNode } from "react";
import { CalendarIcon, ChartSpline, ColumnsIcon, FolderIcon, Grid3x3, Layers3Icon, Rows3Icon } from "lucide-react";

import { MikroChart, MikroFolder, MikroGrid, MikroScene, MikroTableDataset } from "@/core/linkers";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import type { GetTableDatasetQuery } from "@/mikro/api/graphql";

import { RESIDENT_ICON, isNamedResident, residentLink, residentName } from "../residents/residentLinks";

type PageTable = GetTableDatasetQuery["tableDataset"];

/**
 * The top of a table dataset's page: what the table is and what it is ABOUT,
 * before its rows.
 *
 * - The name, and its description in a line or two.
 * - One line of facts: its axes (or "measurement table"), how many rows and
 *   columns, the folder it is filed in, who made it and through which task.
 * - **Describes**: the containers whose contents ARE its row ids
 *   (`TableDataset.keyedBy`) — the label mask whose objects it measures, the
 *   mesh collection whose surfaces — each with the id column it lands on. The
 *   one fact that turns a grid of numbers back into objects, and the way back
 *   to them.
 * - **Shown in**: the scenes, charts and grids that draw this table
 *   (`TableDataset.visualizations`), each a link straight to it.
 *
 * `rowCount` is the table's own (unfiltered) count, which the grid learns
 * from its first page; null until then.
 */
export const TableDatasetHeader = ({ dataset, rowCount }: { dataset: PageTable; rowCount: number | null }) => {
  const keys = dataset.keyedBy.filter((key) => isNamedResident(key.source));
  const created = dataset.createdThrough?.createdAt ? new Date(dataset.createdThrough.createdAt) : null;

  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <MikroTableDataset.DetailLink
          object={dataset}
          className="truncate break-all text-3xl font-semibold leading-tight"
        >
          {dataset.name}
        </MikroTableDataset.DetailLink>
        {dataset.description && <p className="line-clamp-2 text-sm text-muted-foreground">{dataset.description}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="font-mono">{dataset.axisNames.length ? dataset.axisNames.join(" × ") : "measurement table"}</span>
        <Fact icon={<Rows3Icon />} title="Rows">
          {rowCount === null ? "… rows" : `${rowCount.toLocaleString()} ${rowCount === 1 ? "row" : "rows"}`}
        </Fact>
        <Fact icon={<ColumnsIcon />} title="Columns">
          {`${dataset.columns.length} ${dataset.columns.length === 1 ? "column" : "columns"}`}
        </Fact>
        {dataset.folder && (
          <Fact icon={<FolderIcon />} title="Folder">
            <MikroFolder.DetailLink object={dataset.folder} className="hover:text-foreground hover:underline">
              {dataset.folder.name}
            </MikroFolder.DetailLink>
          </Fact>
        )}
        {(dataset.createdThroughBy || dataset.createdThrough) && (
          <span className="flex items-center gap-1.5">
            <span>made</span>
            {dataset.createdThroughBy && (
              <>
                <span>by</span>
                <StructureDisplay identifier="@lok/user" id={dataset.createdThroughBy.sub} variant="inline" />
              </>
            )}
            {dataset.createdThrough && (
              <>
                <span>through</span>
                <StructureDisplay identifier="@rekuest/task" id={dataset.createdThrough.taskId} variant="chip" />
              </>
            )}
          </span>
        )}
        {created && (
          <Fact icon={<CalendarIcon />} title="Created">
            {created.toLocaleDateString()}
          </Fact>
        )}
      </div>

      {keys.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="text-muted-foreground">Describes</span>
          {keys.map((key) => {
            if (!isNamedResident(key.source)) return null;
            const source = key.source;
            const Icon = RESIDENT_ICON[source.__typename];
            const body = (
              <>
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 truncate font-medium">{residentName(source)}</span>
                {key.produces.length > 0 && (
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">by {key.produces.join(", ")}</span>
                )}
              </>
            );
            const chip = "flex max-w-xs items-center gap-1.5 rounded-md border border-border px-2 py-1 hover:bg-muted";
            const link = residentLink(source);
            return (
              <span key={`${source.__typename}:${source.id}`} title={keyTitle(key.produces, key.passesThrough)}>
                {link ? link({ className: chip, children: body }) : <span className={chip}>{body}</span>}
              </span>
            );
          })}
        </div>
      )}

      {dataset.visualizations.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="text-muted-foreground">Shown in</span>
          {dataset.visualizations.map((visualization) => (
            <VisualizationChip key={`${visualization.__typename}:${visualization.id}`} visualization={visualization} />
          ))}
        </div>
      )}
    </header>
  );
};

type PageVisualization = PageTable["visualizations"][number];

const CHIP = "flex max-w-xs items-center gap-1.5 rounded-md border border-border px-2 py-1 hover:bg-muted";

/** One composition drawing this table: its kind's icon and name, linking to its page. */
const VisualizationChip = ({ visualization }: { visualization: PageVisualization }) => {
  const body = (Icon: typeof ChartSpline, kind: string) => (
    <>
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label={kind} />
      <span className="min-w-0 truncate font-medium">{visualization.name}</span>
    </>
  );
  switch (visualization.__typename) {
    case "Chart":
      return (
        <MikroChart.DetailLink object={visualization} className={CHIP} title="Chart">
          {body(ChartSpline, "Chart")}
        </MikroChart.DetailLink>
      );
    case "Grid":
      return (
        <MikroGrid.DetailLink object={visualization} className={CHIP} title="Grid">
          {body(Grid3x3, "Grid")}
        </MikroGrid.DetailLink>
      );
    case "Scene":
      return (
        <MikroScene.DetailLink object={visualization} className={CHIP} title="Scene">
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

const Fact = ({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) => (
  <span className="flex items-center gap-1 [&>svg]:h-3.5 [&>svg]:w-3.5" title={title}>
    {icon}
    <span className="tabular-nums">{children}</span>
  </span>
);
