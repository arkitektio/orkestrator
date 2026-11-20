import { MikroGrid } from "@/core/linkers";
import GridList from "../components/lists/GridList";
import { MIKRO_HELP } from "../help";

const Page = () => (
  <MikroGrid.ListPage title="Grids" help={MIKRO_HELP.grids}>
    <div className="p-3">
      <GridList defaultLimit={40} />
    </div>
  </MikroGrid.ListPage>
);

export default Page;
