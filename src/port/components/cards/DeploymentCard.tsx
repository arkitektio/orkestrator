import { useDialog } from "../../../layout/dialog/DialogProvider";
import { PortDeployment } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { useConfirm } from "../../../providers/confirmer/confirmer-context";
import { ListDeploymentFragment } from "../../api/graphql";

interface UserCardProps {
  scan: ListDeploymentFragment;
  mates: MateFinder[];
}

export const RepoScanCard = ({ scan, mates }: UserCardProps) => {
  const { ask } = useDialog();

  const { confirm } = useConfirm();

  return (
    <PortDeployment.Smart
      object={scan.id}
      className="max-w-sm rounded shadow-md bg-gray-700 text-white group"
      mates={mates}
    >
      <div className="p-2 ">
        <div className="flex">
          <PortDeployment.DetailLink
            object={scan.id}
            className="flex-grow font-semibold text-xs"
          >
            {scan.identifier}:{scan.version}
          </PortDeployment.DetailLink>
          {scan.whales && scan.whales.length > 0 && <>Deployed</>}
        </div>
      </div>
    </PortDeployment.Smart>
  );
};
