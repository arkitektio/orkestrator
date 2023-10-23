import { withMikro } from "../../mikro/MikroContext";
import { usePutFilesMutation } from "../../mikro/api/graphql";
import { useConfirm } from "../../providers/confirmer/confirmer-context";
import { MateFinder } from "../types";

export const usePutFilesInDatasetsMate = (): MateFinder => {
  const { confirm } = useConfirm();
  const [put] = withMikro(usePutFilesMutation)();

  return async (options) => {
    console.log("Dragging over", options);
    if (options.partners?.every((p) => p.identifier === "@mikro/omerofile")) {
      return [
        {
          action: async (event) => {
            put({
              variables: {
                files: event.partners.map((p) => p.id),
                dataset: event.self.id,
              },
            });
          },
          label: (
            <>
              Put {options.partners.length > 1 && options.partners.length}{" "}
              File(s) in Dataset
            </>
          ),
          description: "Put these files in this dataset",
        },
      ];
    }
  };
};
