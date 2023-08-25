import { MikroSample } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListSampleFragment } from "../../api/graphql";

export const SampleCard: React.FC<{
  sample: ListSampleFragment;
  mates: MateFinder[];
}> = ({ sample, mates }) => {
  return (
    <MikroSample.Smart
      object={sample?.id}
      dragClassName={() =>
        "bg-slate-700 text-white rounded shadow-md pl-3 truncate group"
      }
      mates={mates}
    >
      <div className="my-2">
        <MikroSample.DetailLink
          className="cursor-pointer font-semibold"
          object={sample.id}
        >
          {sample?.name}
        </MikroSample.DetailLink>
      </div>
    </MikroSample.Smart>
  );
};
