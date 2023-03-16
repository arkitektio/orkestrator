import React from "react";
import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../../components/confirmer/confirmer-context";
import { Dataset, Experiment } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { Data } from "../../../pages/Data";
import {
  ListDatasetFragment,
  useDeleteDatasetMutation,
} from "../../api/graphql";
import { withMikro } from "../../MikroContext";

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
    <Dataset.Smart
      object={dataset?.id}
      className={`bg-slate-700 text-white rounded shadow-md pl-3  group`}
      mates={mates}
    >
      <div className="px-1 py-2 truncate">
        <Dataset.DetailLink
          className="flex-grow cursor-pointer font-semibold"
          object={dataset.id}
        >
          {dataset?.name}
        </Dataset.DetailLink>
      </div>
    </Dataset.Smart>
  );
};
