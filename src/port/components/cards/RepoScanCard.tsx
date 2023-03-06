import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../../components/confirmer/confirmer-context";
import { useDialog } from "../../../layout/dialog/DialogProvider";
import { RepoScan } from "../../../linker";
import { ListRepoScanFragment } from "../../api/graphql";
import { PrepareScanDialog } from "../dialogs/PrepareScanDialog";

interface UserCardProps {
  scan: ListRepoScanFragment;
}

export const RepoScanCard = ({ scan }: UserCardProps) => {
  const { ask } = useDialog();

  const { confirm } = useConfirm();

  return (
    <RepoScan.Smart
      object={scan.id}
      className="max-w-sm rounded shadow-md bg-gray-700 text-white group"
      additionalMates={(accept, self) => {
        if (!self) return [];

        if (accept == "item:@port/reposcan") {
          return [
            {
              accepts: [accept],
              action: async (self, drops) => {
                await confirm({
                  message: "Do you really want to delete?",
                  subtitle: "Deletion is irreversible!",
                  confirmLabel: "Yes delete!",
                });
              },
              label: <BsTrash />,
              description: "Delete Run",
            },
            {
              action: async (self, drops) => {
                let d = await ask(PrepareScanDialog, { scan: scan.id });
              },
              label: "Appify",
              description: "Apiffy this scan",
            },
          ];
        }

        return [];
      }}
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
