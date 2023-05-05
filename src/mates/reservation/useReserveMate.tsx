import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import {
  MyOmeroFilesDocument,
  MyOmeroFilesQuery,
  MyOmeroFilesQueryVariables,
  useDeleteOmeroFileMutation,
  useReleaseFilesMutation,
} from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/MikroContext";
import {
  ListReservationFragment,
  ReservationStatus,
} from "../../rekuest/api/graphql";
import { usePostman } from "../../rekuest/postman/graphql/postman-context";
import {
  AdditionalMate,
  Mate,
} from "../../rekuest/postman/mater/mater-context";
import { useRequester } from "../../rekuest/postman/requester/requester-context";
import { MateFinder } from "../types";

export const useRequesterMate = (): ((
  res: ListReservationFragment
) => MateFinder) => {
  const { assign, unassign } = useRequester();
  const { unreserve } = usePostman();

  return (res) => (type, isSelf) => {
    let mates: AdditionalMate[] = [];

    if (res.status === ReservationStatus.Active) {
      mates.push({
        action: async () => {
          await assign({ reservation: res });
        },
        label: "Assign",
      });
    }

    return mates.concat([
      {
        action: async () => {
          await unreserve({ variables: { reservation: res.id } });
        },
        label: "Unreserve",
      },
    ]);
  };
};
