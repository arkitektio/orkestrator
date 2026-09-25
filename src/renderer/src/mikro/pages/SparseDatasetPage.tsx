import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { MikroSparseDataset } from "@/core/linkers";
import { useGetSparseDatasetQuery } from "../api/graphql";
import { sparseDatasetTitle } from "../components/sparse/sparseFacts";
import CoordinateGraphView from "../components/coordinates/CoordinateGraphView";
import { SparseDatasetInfoSidebar } from "../components/sidebars/SparseDatasetInfoSidebar";
import { SparseDatasetOverview } from "../components/sparse/SparseDatasetOverview";

/**
 * Laid out like `ArrayDatasetPage` and `TableDatasetPage`: the data fills the
 * middle and everything *about* it lives in the rail. An array's middle is a
 * scene and a table's is its rows; a sparse matrix has no picture and no rows
 * worth paging (a cell-by-gene matrix is mostly the zeros it does not store),
 * so its middle is the matrix's structure — its axes, the layouts that hold
 * it and which table names each axis — with the coordinate anchors docked in
 * the corner exactly where the other two pages keep theirs.
 *
 * Black like the table page, for the same reason it is not a scene: the
 * overlay chrome the anchors panel is drawn with is white-on-black.
 */
export const SparseDatasetPage = asDetailQueryRoute(
  useGetSparseDatasetQuery,
  ({ data }) => {
    const dataset = data.sparseDataset;

    return (
      <MikroSparseDataset.ModelPage
        object={dataset}
        title={sparseDatasetTitle(dataset.name)}
        variant="black"
        overlay
        actions={<MikroSparseDataset.Actions object={dataset} />}
        pageActions={<MikroSparseDataset.ObjectButton alwaysShow object={dataset} />}
        additionalSidebars={
          <>
            <Sidebars.Tab label="Info">
              <SparseDatasetInfoSidebar dataset={dataset} />
            </Sidebars.Tab>
            {/* The matrix owns its coordinate system — its two enumerations
                are the axes — so the graph around that system is this
                matrix's neighbourhood: what it was computed from, and what a
                FIELD edge landed in it. */}
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
        // Own key, like the other dataset pages: with the app-wide one a
        // remembered "Knowledge" would beat `defaultSidebar`.
        sidebarKey="SparseDatasetDetail"
      >
        <SparseDatasetOverview dataset={dataset} />
      </MikroSparseDataset.ModelPage>
    );
  },
);

export default SparseDatasetPage;
