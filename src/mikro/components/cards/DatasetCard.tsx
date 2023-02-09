import React from "react";
import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../../components/confirmer/confirmer-context";
import { Dataset, Experiment } from "../../../linker";
import { Data } from "../../../pages/Data";
import {
  ListDatasetFragment,
  useDeleteDatasetMutation,
} from "../../api/graphql";
import { withMikro } from "../../MikroContext";

interface DatasetCardProps {
  dataset: ListDatasetFragment;
}

export const DatasetCard = ({ dataset }: DatasetCardProps) => {
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
      additionalMates={(accept, self) => {
        if (!self) return [];

        return [
          {
            accepts: [accept],
            action: async (self, drops) => {
              await confirm({
                message: "Do you really want to delete?",
                subtitle: "Deletion is irreversible!",
                confirmLabel: "Yes delete!",
              });

              await deleteDataset({
                variables: { id: dataset.id },
              });
            },
            label: <BsTrash />,
            description: "Delete",
          },
        ];
      }}
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
