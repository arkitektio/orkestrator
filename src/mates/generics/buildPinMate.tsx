import { TiPin, TiPinOutline } from "react-icons/ti";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { usePinSampleMutation } from "../../mikro/api/graphql";
import { MateFinder } from "../types";

export type PinFunction = typeof usePinSampleMutation;
export type PinnableObject = {
  __typename?: string | undefined;
  pinned?: boolean;
};

export type DeleteObjectFinder = (object: PinnableObject) => MateFinder;

export function buildPinMate(xfunction: PinFunction): () => DeleteObjectFinder {
  return () => {
    const { confirm } = useConfirm();

    const [pinFunction] = xfunction({} as any);

    return (object: PinnableObject) => (type, isSelf) => {
      if (isSelf) {
        return [
          {
            action: async (self, partner) => {
              pinFunction({
                variables: {
                  id: partner[0].object,
                  pin: object.pinned == undefined ? true : !object.pinned,
                },
              });
            },
            label: <>{object.pinned != false ? <TiPin /> : <TiPinOutline />}</>,
            description: `Pin this ${object.__typename}`,
          },
        ];
      }
    };
  };
}
