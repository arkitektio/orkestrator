import { Explainer } from "@/core/layout/Explainer";
import { MikroGrid } from "@/core/linkers";
import GridList from "../components/lists/GridList";
import { MIKRO_HELP } from "../help";

const Page = () => (
  <MikroGrid.ListPage title="Grids" help={MIKRO_HELP.grids}>
    <div className="p-3">
      <Explainer
        title="Grids"
        description="A grid lays out members in rows and columns -- genes against cells, cells against channels, a plate's wells -- and colours each cell by a value."
      />
      <GridList defaultLimit={40} />
    </div>
  </MikroGrid.ListPage>
);

export default Page;
