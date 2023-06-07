import { useConfirm } from "../../components/confirmer/confirmer-context";
import { withRekuest } from "../../rekuest";
import { useProvideMutation } from "../../rekuest/api/graphql";
import { MateFinder } from "../types";

export const useProvideMate = () => {
  const { confirm } = useConfirm();

  const [link] = withRekuest(useProvideMutation)();
  return (res: { id: string }): MateFinder =>
    (type, isSelf) => {
      if (isSelf) {
        return [
          {
            action: async (self, drops) => {
              await link({
                variables: {
                  template: self?.object,
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
