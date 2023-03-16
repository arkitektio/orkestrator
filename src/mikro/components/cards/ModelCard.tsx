import { Model } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListModelFragment } from "../../api/graphql";

export const ModelCard: React.FC<{
  model: ListModelFragment;
  mates: MateFinder[];
}> = ({ model, mates }) => {
  return (
    <Model.Smart
      object={model?.id}
      className={`bg-slate-700 text-white rounded shadow-md pl-3  group`}
      mates={mates}
    >
      <div className="px-1 py-2 truncate">
        <Model.DetailLink
          className="flex-grow cursor-pointer font-semibold"
          object={model.id}
        >
          {model?.name}
        </Model.DetailLink>
      </div>
    </Model.Smart>
  );
};
