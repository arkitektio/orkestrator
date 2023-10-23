import { withMikro } from "../../mikro/MikroContext";
import { usePutFilesInDatasetMutation } from "../../mikro_next/api/graphql";
import { useConfirm } from "../../providers/confirmer/confirmer-context";
import { MateFinder } from "../types";

export const usePutFilesInDatasetsMate = (): MateFinder => {
  const { confirm } = useConfirm();
  const [put] = withMikro(usePutFilesInDatasetMutation)();

  return async (options) => {
    console.log("Dragging over", options)
    if (options.partners?.every((p) => p.identifier === "@mikro/omerofile")) {
      return [
        {
          action: async (event) => {

            put({
              variables: {
                selfs: event.partners.map((p) => p.id),
                other: event.self.id,
              },
            });
          },
          label: <>Put</>,
          description: "Put these files in this dataset",
        },
      ];
    }
  };
};
