import { useConfirm } from "../../providers/confirmer/confirmer-context";
import { withRekuest } from "../../rekuest";
import { useProvideMutation } from "../../rekuest/api/graphql";
import { MateFinder } from "../types";

export const useProvideMate = () => {
  const { confirm } = useConfirm();
  const [link] = withRekuest(useProvideMutation)();
  return (res: { id: string }): MateFinder =>
    async (options) => {
      if (options.justSelf) {
        return [
          {
            action: async (event) => {
              await link({
                variables: {
                  template: event.self.id,
                },
              });
            },
            label: "Provide",
            description: "Provide this template",
          },
        ];
      }

      return [];
    };
};
