import { TiPin, TiPinOutline } from "react-icons/ti";
import { usePinSampleMutation } from "../../mikro/api/graphql";
import { useConfirm } from "../../providers/confirmer/confirmer-context";
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

    return (object: PinnableObject) => async (options) => {
      if (options.partnersIncludeSelf) {
        return [
          {
            action: async (event) => {
              for (const partner of event.partners) {
                pinFunction({
                  variables: {
                    id: partner.id,
                    pin: object.pinned == undefined ? true : !object.pinned,
                  },
                });
              }
            },
            label: <>{object.pinned != false ? <TiPin /> : <TiPinOutline />}</>,
            description: `Pin this ${object.__typename}`,
          },
        ];
      }
    };
  };
}
