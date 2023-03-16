import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../../components/confirmer/confirmer-context";
import { useDialog } from "../../../layout/dialog/DialogProvider";
import { RepoScan } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListRepoScanFragment } from "../../api/graphql";
import { PrepareScanDialog } from "../dialogs/PrepareScanDialog";

interface UserCardProps {
  scan: ListRepoScanFragment;
  mates: MateFinder[];
}

export const RepoScanCard = ({ scan, mates }: UserCardProps) => {
  const { ask } = useDialog();

  const { confirm } = useConfirm();

  return (
    <RepoScan.Smart
      object={scan.id}
      className="max-w-sm rounded shadow-md bg-gray-700 text-white group"
      mates={mates}
    >
      <div className="p-2 ">
        <div className="flex">
          <RepoScan.DetailLink
            object={scan.id}
            className="flex-grow font-semibold text-xs"
          >
            {scan.identifier}:{scan.version}
          </RepoScan.DetailLink>
          {scan.whales && scan.whales.length > 0 && <>Deployed</>}
        </div>
      </div>
    </RepoScan.Smart>
  );
};
