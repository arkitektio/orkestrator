import { useMemo, useState } from "react";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { MikroTableDataset } from "@/core/linkers";
import { useGetTableDatasetQuery } from "../api/graphql";
import CoordinateGraphView from "../components/coordinates/CoordinateGraphView";
import { AttributeServiceProvider } from "../lib/attributes/AttributeServiceProvider";
import { TableDatasetInfoSidebar } from "../components/sidebars/TableDatasetInfoSidebar";
import { TableDatasetHeader } from "../components/tables/TableDatasetHeader";
import { TableDatasetTable } from "../components/tables/TableDatasetTable";
import { MIKRO_HELP } from "../help";
import { wholeLensContexts } from "../lenses";

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
    // An id column a mesh collection keys links each value to that mesh's page.
    const meshLinks = useMemo(
      () =>
        new Map(
          dataset.keyedBy.flatMap((key) =>
            key.source.__typename === "MeshCollection" && key.produces.length === 1
              ? [[key.produces[0], key.source.id] as const]
              : [],
          ),
        ),
      [dataset.keyedBy],
    );
    // The table's own row count, as the grid learns it from its first page.
    const [rowCount, setRowCount] = useState<number | null>(null);
    // Its whole lens, offered in the ⌘K palette beside the table itself.
    const wholeLensId = dataset.fullLens?.id;
    const related = useMemo(
      () => wholeLensContexts("TableLens", wholeLensId ? { id: wholeLensId } : null),
      [wholeLensId],
    );

    // The column popover reads a column's values through the shared parquet
    // engine, from the table header AND from the Info rail. The provider sits
    // outside `ModelPage` because the layout renders the rail as a sibling of
    // the page body, not inside it — a provider around the body alone would
    // never reach the rail. The module route already guards on Mikro.
    return (
      <AttributeServiceProvider>
        <MikroTableDataset.ModelPage
          object={dataset}
          help={MIKRO_HELP.tableDataset}
          title={dataset.name}
          related={related}
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
          {/* `pt-3`: the overlay layout insets the sides and the bottom only
              (a canvas wants its top edge), and a page of rows wants the same
              inset all round as every other detail page. */}
          <div className="flex h-full w-full flex-col gap-3 pt-3">
            {/* What the table is and what it describes, in flow above the
                rows — there is no picture to float a title over. */}
            <TableDatasetHeader dataset={dataset} rowCount={rowCount} />

            {/* `min-h-0` so the table's own scroll container is what scrolls:
                without it the flex item grows to its content and the page scrolls
                instead, taking the column headers off screen. */}
            <div className="min-h-0 flex-1">
              <TableDatasetTable table={dataset} onRowCount={setRowCount} meshLinks={meshLinks} />
            </div>
          </div>
        </MikroTableDataset.ModelPage>
      </AttributeServiceProvider>
    );
  },
);

export default TableDatasetPage;
