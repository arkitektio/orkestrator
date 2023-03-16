import React from "react";
import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../../components/confirmer/confirmer-context";
import { Context, Dataset, Experiment } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { Data } from "../../../pages/Data";
import {
  ListContextFragment,
  ListDatasetFragment,
  useDeleteDatasetMutation,
} from "../../api/graphql";
import { withMikro } from "../../MikroContext";

interface ContextCardProps {
  context: ListContextFragment;
  mates: MateFinder[];
}

export const ContextCard = ({ context, mates }: ContextCardProps) => {
  const onDrop = (...args: any) => {
    console.log(args);
  };

  const { confirm } = useConfirm();

  const [deleteContext, res] = withMikro(useDeleteDatasetMutation)();

  if (!context?.id) return <></>;

  return (
    <Context.Smart
      object={context?.id}
      className={`bg-slate-700 text-white rounded shadow-md px-3  group`}
      mates={mates}
    >
      <div className="px-1 py-2 truncate">
        <Context.DetailLink
          className="flex-grow cursor-pointer font-semibold"
          object={context.id}
        >
          {context?.name}
        </Context.DetailLink>
      </div>
    </Context.Smart>
  );
};
