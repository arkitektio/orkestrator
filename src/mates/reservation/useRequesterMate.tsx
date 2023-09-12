import {
  ListReservationFragment,
  ReservationStatus,
} from "../../rekuest/api/graphql";
import { usePostman } from "../../rekuest/providers/postman/postman-context";
import { useRequester } from "../../rekuest/providers/requester/requester-context";
import { Mate, MateFinder } from "../types";

export const useRequesterMate = (): ((
  res: ListReservationFragment
) => MateFinder) => {
  const { assign } = useRequester();
  const { unreserve } = usePostman();

  return (res) => async (options) => {
    let mates: Mate[] = [];

    if (options.justSelf) {
      if (res.status === ReservationStatus.Active) {
        mates.push({
          action: async () => {
            await assign({ reservation: res });
          },
          label: "Assign",
        });
      }

      mates.concat([
        {
          action: async () => {
            await unreserve({ reservation: res.id });
          },
          label: "Unreserve",
        },
      ]);
    }

    return mates;
  };
};
