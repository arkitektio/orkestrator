import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { Badge } from "@/components/ui/badge";
import { MikroTableDataset } from "@/linkers";
import { useGetTableDatasetQuery } from "../api/graphql";
import CoordinateGraphView from "../components/coordinates/CoordinateGraphView";
import { AttributeServiceProvider } from "../lib/attributes/AttributeServiceProvider";
import { TableDatasetInfoSidebar } from "../components/sidebars/TableDatasetInfoSidebar";
import { TableDatasetTable } from "../components/tables/TableDatasetTable";

/**
 * Laid out like `ArrayDatasetPage`: the data fills the middle and everything *about*
 * it lives in the rail. For an array dataset the middle is a scene; here it is
 * the rows, which is the whole difference between the two pages.
 *
 * That is why the cards are gone. The schema, the axes and the space this table
 * owns used to be three stacked cards above a 600px table — so the rows, the one
 * thing the page is for, started below the fold. They are sections of the Info
 * tab now, and the coordinate graph (which wants room, not a card) is a tab of
 * its own.
 *
 * Unlike the array page this keeps the default page variant rather than going
 * black: the black canvas is for pictures, and a table of numbers on it would be
 * a table nobody can read.
 */
export const TableDatasetPage = asDetailQueryRoute(
  useGetTableDatasetQuery,
  ({ data }) => {
    const dataset = data.tableDataset;

    // The column popover reads a column's values through the shared parquet
    // engine, from the table header AND from the Info rail. The provider sits
    // outside `ModelPage` because the layout renders the rail as a sibling of
    // the page body, not inside it — a provider around the body alone would
    // never reach the rail. The module route already guards on Mikro.
    return (
      <AttributeServiceProvider>
        <MikroTableDataset.ModelPage
          object={dataset}
          title={dataset.name}
          variant={"black"}
          overlay
          actions={<MikroTableDataset.Actions object={dataset} />}
          additionalSidebars={
            <>
              <Sidebars.Tab label="Info">
                <TableDatasetInfoSidebar dataset={dataset} />
              </Sidebars.Tab>
              {/* The table owns its coordinate system, so the graph around that
                  system is this table's neighbourhood: what it is registered
                  into, and what was computed from it. */}
              <Sidebars.Tab label="Space">
                <div className="h-full w-full">
                  <CoordinateGraphView
                    coordinateSystem={dataset.coordinateSystem.id}
                  />
                </div>
              </Sidebars.Tab>
            </>
          }
          defaultSidebar="Info"
          // Own key, like the scene pages: with the app-wide one a remembered
          // "Knowledge" would beat `defaultSidebar` and the rail would open on a
          // tab this page did not choose.
          sidebarKey="TableDatasetDetail"
        >
          <div className="flex h-full w-full flex-col gap-2">
            {/* The same title treatment the array page floats over its canvas,
                in flow rather than absolute — there is no picture to float over
                and covering rows would only hide data. */}
            <div className="flex flex-col gap-0.5">
              <MikroTableDataset.DetailLink
                object={dataset}
                className="ellipsis truncate break-all text-3xl font-semibold leading-tight text-ellipsis"
              >
                {dataset.name}
              </MikroTableDataset.DetailLink>
              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <span className="truncate">
                  {dataset.axisNames.length
                    ? dataset.axisNames.join(" × ")
                    : "measurement table"}
                </span>
                <Badge variant="outline" className="font-sans text-[0.625rem]">
                  {dataset.columns.length} columns
                </Badge>
              </div>
            </div>

            {/* `min-h-0` so the table's own scroll container is what scrolls:
                without it the flex item grows to its content and the page scrolls
                instead, taking the column headers off screen. */}
            <div className="min-h-0 flex-1">
              <TableDatasetTable table={dataset} />
            </div>
          </div>
        </MikroTableDataset.ModelPage>
      </AttributeServiceProvider>
    );
  },
);

export default TableDatasetPage;
