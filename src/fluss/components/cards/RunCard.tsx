import Timestamp from "react-timestamp";
import { FlussRun } from "../../../linker";
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
    <FlussRun.Smart
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
        <FlussRun.DetailLink
          className="text-xl font-light cursor-pointer mb-1"
          object={run?.id}
        >
          {run?.flow?.workspace?.name || "No Flow"}
        </FlussRun.DetailLink>
      </div>
      <div className="pl-2 pb-2"></div>
    </FlussRun.Smart>
  );
};
