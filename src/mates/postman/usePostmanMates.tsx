import { withRekuest } from "../../rekuest";
import { useReservationsQuery } from "../../rekuest/api/graphql";
import { useRequester } from "../../rekuest/providers/requester/requester-context";
import { useSettings } from "../../settings/settings-context";
import { notEmpty } from "../../utils";
import { MateFinder } from "../types";

export const usePostmanMate: () => MateFinder = () => {
  const { assign } = useRequester();
  const { settings } = useSettings();

  const { data } = withRekuest(useReservationsQuery)({
    variables: {
      instanceId: settings.instanceId,
    },
  });

  return async (options) => {
    if (options.justSelf) {
      try {
        let matching = data?.reservations
          ?.filter(notEmpty)
          .filter(
            (r) => r.node.args?.at(0)?.identifier == options.self.identifier
          );

        if (matching) {
          return matching.map((r) => ({
            action: async (event) => {
              let key = r?.node?.args?.at(0)?.key;
              console.log(key);

              await assign({
                reservation: r,
                defaults: key ? { [key]: event.self.id } : {},
              });
              return "Assigned";
            },
            label: r?.title || r?.node.name,
          }));
        }
      } catch (e) {
        console.error(e);
      }

      return [];
    }

    return [];
  };
};
