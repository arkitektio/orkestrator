import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { MikroCoordinateSystem, MikroGrid } from "@/core/linkers";
import { useGetGridQuery } from "../api/graphql";
import { Grid } from "../components/grid/Grid";
import { MIKRO_HELP } from "../help";

/** A grid: the members of one or two enumerating axes, each cell coloured by a value. */
export const GridPage = asDetailQueryRoute(useGetGridQuery, (props) => {
  const grid = props.data.grid;
  const axes = [grid.rowAxis, grid.columnAxis].filter((a): a is NonNullable<typeof a> => a != null);
  return (
    <Grid.Provider grid={grid}>
      <MikroGrid.ModelPage
        overlay
        object={grid}
        help={MIKRO_HELP.grid}
        title={grid.name}
        actions={<MikroGrid.Actions object={grid} />}
        additionalSidebars={
          <>
            <Sidebars.Tab label="Layers">
              <Grid.LayersSidebar />
            </Sidebars.Tab>
            <Sidebars.Tab label="About">
              <div className="flex flex-col gap-3 p-4 text-sm">
                {grid.description && <p className="text-muted-foreground">{grid.description}</p>}
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Rows, then columns</span>
                  {axes.map((axis) => (
                    <span key={axis.id} className="font-mono">
                      {axis.name} <span className="text-muted-foreground">({axis.type.toLowerCase()})</span>
                    </span>
                  ))}
                  <MikroCoordinateSystem.DetailLink object={grid.worldCoordinateSystem} className="hover:text-primary">
                    {grid.worldCoordinateSystem.name}
                  </MikroCoordinateSystem.DetailLink>
                </div>
              </div>
            </Sidebars.Tab>
          </>
        }
        defaultSidebar="Layers"
        sidebarKey="GridDetail"
      >
        <div className="relative h-full w-full">
          <Grid.Viewport />
        </div>
      </MikroGrid.ModelPage>
    </Grid.Provider>
  );
});

export default GridPage;
