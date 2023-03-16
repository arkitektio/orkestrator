import { Plot } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListPlotFragment } from "../../api/graphql";

export const PlotCard: React.FC<{
  plot: ListPlotFragment;
  mates: MateFinder[];
}> = ({ plot, mates }) => {
  return (
    <Plot.Smart
      object={plot?.id}
      dragClassName={({ isOver, canDrop }) =>
        `bg-slate-700 text-white rounded overflow-hidden shadow-md pl-3 pr-2 py-2 flex group ${
          isOver && "border-primary-200 border"
        }`
      }
      mates={mates}
    >
      <Plot.DetailLink
        className="cursor-pointer font-semibold"
        object={plot.id}
      >
        {plot?.name}
      </Plot.DetailLink>
    </Plot.Smart>
  );
};
