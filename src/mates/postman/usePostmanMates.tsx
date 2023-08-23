import { withRekuest } from "../../rekuest";
import {
  PortKindInput,
  useThisFilteredReservationsLazyQuery,
} from "../../rekuest/api/graphql";
import { useRequester } from "../../rekuest/providers/requester/requester-context";
import { useSettings } from "../../settings/settings-context";
import { MateFinder } from "../types";

export const usePostmanMate: () => MateFinder = () => {
  const { assign } = useRequester();
  const { settings } = useSettings();

  const [find] = withRekuest(useThisFilteredReservationsLazyQuery)();

  return async (options) => {
    if (options.justSelf) {
      try {
        let reservations = await find({
          fetchPolicy: "network-only",
          variables: {
            instanceId: settings.instanceId,
            inputPortDemands: [
              {
                at: 0,
                kind: PortKindInput.Structure,
                identifier: options.self.identifier,
              },
            ],
          },
        });

        console.log("reservations", reservations);

        if (reservations.data?.reservations) {
          return reservations.data.reservations.map((r) => ({
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
