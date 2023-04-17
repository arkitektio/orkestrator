import { Sample } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListSampleFragment } from "../../api/graphql";

export const SampleCard: React.FC<{
  sample: ListSampleFragment;
  mates: MateFinder[];
}> = ({ sample, mates }) => {
  return (
    <Sample.Smart
      object={sample?.id}
      dragClassName={() =>
        "bg-slate-700 text-white rounded shadow-md pl-3 truncate group"
      }
      mates={mates}
    >
      <div className="my-2">
        <Sample.DetailLink
          className="cursor-pointer font-semibold"
          object={sample.id}
        >
          {sample?.name}
        </Sample.DetailLink>
      </div>
    </Sample.Smart>
  );
};
