import { MikroContext } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { useConfirm } from "../../../providers/confirmer/confirmer-context";
import { withMikro } from "../../MikroContext";
import {
  ListContextFragment,
  useDeleteDatasetMutation,
} from "../../api/graphql";

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
    <MikroContext.Smart
      object={context?.id}
      className={`bg-slate-700 text-white rounded shadow-md px-3  group`}
      mates={mates}
    >
      <div className="px-1 py-2 truncate">
        <MikroContext.DetailLink
          className="flex-grow cursor-pointer font-semibold"
          object={context.id}
        >
          {context?.name}
        </MikroContext.DetailLink>
      </div>
    </MikroContext.Smart>
  );
};
