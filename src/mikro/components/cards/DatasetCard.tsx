import { MikroDataset } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { useConfirm } from "../../../providers/confirmer/confirmer-context";
import { withMikro } from "../../MikroContext";
import {
  ListDatasetFragment,
  useDeleteDatasetMutation,
} from "../../api/graphql";

interface DatasetCardProps {
  dataset: ListDatasetFragment;
  mates: MateFinder[];
}

export const DatasetCard = ({ dataset, mates }: DatasetCardProps) => {
  const onDrop = (...args: any) => {
    console.log(args);
  };

  const { confirm } = useConfirm();

  const [deleteDataset, res] = withMikro(useDeleteDatasetMutation)();

  if (!dataset?.id) return <></>;

  return (
    <MikroDataset.Smart
      object={dataset?.id}
      className={`bg-slate-700 text-white rounded shadow-md pl-3  group`}
      mates={mates}
    >
      <div className="px-1 py-2 truncate">
        <MikroDataset.DetailLink
          className="flex-grow cursor-pointer font-semibold"
          object={dataset.id}
        >
          {dataset?.name}
        </MikroDataset.DetailLink>
      </div>
    </MikroDataset.Smart>
  );
};
