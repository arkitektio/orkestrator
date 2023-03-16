import Timestamp from "react-timestamp";
import { Run } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListRunFragment } from "../../api/graphql";

export const RunCard = ({
  run,
  mates,
}: {
  run: ListRunFragment;
  mates: MateFinder[];
}) => {
  return (
    <Run.Smart
      object={run.id}
      className="max-w-sm rounded  shadow-md bg-slate-800 text-white group"
      mates={mates}
    >
      <div className="p-2 ">
        <div className="flex">
          <span className="flex-grow font-semibold text-xs">
            <Timestamp date={run.createdAt} relative />
          </span>
        </div>
        <Run.DetailLink
          className="text-xl font-light cursor-pointer mb-1"
          object={run?.id}
        >
          {run?.flow?.workspace?.name || "No Flow"}
        </Run.DetailLink>
      </div>
      <div className="pl-2 pb-2"></div>
    </Run.Smart>
  );
};
