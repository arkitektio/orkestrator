import { useConfirm } from "../../components/confirmer/confirmer-context";
import { MateFinder } from "../types";

export const useExportDatasetMate = (): MateFinder => {
  const { confirm } = useConfirm();

  return (type, isSelf) => {
    if (isSelf || type == "list:@mikro/dataset") {
      return [
        {
          action: async (self, partner, progress) => {
            await progress(0.1);
            await confirm({
              message: "Are you sure you want to export this dataset?",
            });
            await progress(0.5);
            await new Promise((r) => setTimeout(r, 1000));
          },
          label: <>Export</>,
          description: "Release this file from this dataset",
        },
      ];
    }
  };
};
